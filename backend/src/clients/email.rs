use reqwest::Client;
use serde::Serialize;

#[derive(Debug, thiserror::Error)]
pub enum EmailError {
    #[error("email send failed: {0}")]
    SendFailed(String),
    #[error("email network error: {0}")]
    NetworkError(#[from] reqwest::Error),
}

// Embed HTML templates at compile time.
const TEMPLATE_MAGIC_LINK: &str = include_str!("../../emails/magic_link.html");
const TEMPLATE_INVOICE_PAID: &str = include_str!("../../emails/invoice_paid.html");
const TEMPLATE_WELCOME: &str = include_str!("../../emails/welcome.html");

/// Replace `{{key}}` placeholders in a template with the given values.
fn render_template(template: &str, vars: &[(&str, &str)]) -> String {
    vars.iter().fold(template.to_string(), |acc, (key, val)| {
        acc.replace(&format!("{{{{{}}}}}", key), val)
    })
}

/// Truncate a TX hash to first 8 + "..." + last 8 chars.
fn truncate_tx_hash(hash: &str) -> String {
    if hash.len() <= 20 {
        return hash.to_string();
    }
    format!("{}...{}", &hash[..8], &hash[hash.len() - 8..])
}

pub struct ResendClient {
    api_key: String,
    from_address: String,
    http: Client,
}

#[derive(Serialize)]
struct SendEmailRequest {
    from: String,
    to: Vec<String>,
    subject: String,
    html: String,
}

impl ResendClient {
    pub fn from_env() -> Result<Self, String> {
        let api_key = std::env::var("RESEND_API_KEY")
            .map_err(|_| "RESEND_API_KEY not set".to_string())?;
        let from_address = std::env::var("RESEND_FROM_ADDRESS")
            .unwrap_or_else(|_| "NeetPay <noreply@neetpay.com>".to_string());

        Ok(Self {
            api_key,
            from_address,
            http: Client::new(),
        })
    }

    /// Low-level send — calls Resend API.
    async fn send(&self, to: &str, subject: &str, html: &str) -> Result<(), EmailError> {
        let req = SendEmailRequest {
            from: self.from_address.clone(),
            to: vec![to.to_string()],
            subject: subject.to_string(),
            html: html.to_string(),
        };

        let res = self
            .http
            .post("https://api.resend.com/emails")
            .header("Authorization", format!("Bearer {}", self.api_key))
            .json(&req)
            .send()
            .await?;

        if !res.status().is_success() {
            let body = res.text().await.unwrap_or_default();
            return Err(EmailError::SendFailed(body));
        }

        Ok(())
    }

    // ─── Magic Link ──────────────────────────────────────────────────────────

    pub async fn send_magic_link(
        &self,
        to_email: &str,
        magic_url: &str,
    ) -> Result<(), EmailError> {
        let now = chrono::Utc::now().format("%d/%m/%Y %H:%M UTC").to_string();
        let html = render_template(TEMPLATE_MAGIC_LINK, &[
            ("magic_url", magic_url),
            ("email", to_email),
            ("timestamp", &now),
        ]);

        self.send(to_email, "Connexion a NeetPay", &html).await
    }

    // ─── Invoice Paid ────────────────────────────────────────────────────────

    pub async fn send_invoice_paid(
        &self,
        to_email: &str,
        amount_xmr: &str,
        amount_fiat: &str,
        invoice_id: &str,
        paid_at: &str,
        tx_hash: &str,
        invoice_url: &str,
    ) -> Result<(), EmailError> {
        let html = render_template(TEMPLATE_INVOICE_PAID, &[
            ("amount_xmr", amount_xmr),
            ("amount_fiat", amount_fiat),
            ("invoice_id", invoice_id),
            ("paid_at", paid_at),
            ("tx_hash_short", &truncate_tx_hash(tx_hash)),
            ("invoice_url", invoice_url),
        ]);

        self.send(to_email, "Paiement recu - NeetPay", &html).await
    }

    // ─── Welcome ─────────────────────────────────────────────────────────────

    pub async fn send_welcome(
        &self,
        to_email: &str,
        dashboard_url: &str,
    ) -> Result<(), EmailError> {
        let html = render_template(TEMPLATE_WELCOME, &[
            ("dashboard_url", dashboard_url),
        ]);

        self.send(to_email, "Bienvenue sur NeetPay", &html).await
    }
}

impl Clone for ResendClient {
    fn clone(&self) -> Self {
        Self {
            api_key: self.api_key.clone(),
            from_address: self.from_address.clone(),
            http: self.http.clone(),
        }
    }
}
