import Link from "next/link";

const FOOTER_LINKS = {
  Product: [
    { label: "Features", href: "#products" },
    { label: "Pricing", href: "#pricing" },
    { label: "Dashboard", href: "/dashboard" },
  ],
  Developers: [
    { label: "Documentation", href: "/docs" },
    { label: "API Reference", href: "/docs" },
  ],
  Legal: [
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Terms of Service", href: "/terms" },
    { label: "Contact", href: "mailto:hello@neetpay.com" },
  ],
};

export function Footer() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div>
            <Link
              href="/"
              className="font-heading text-lg font-bold tracking-tight"
            >
              <span className="text-foreground">neet</span>
              <span className="text-primary">pay</span>
            </Link>
            <p className="mt-3 text-sm text-foreground-secondary leading-relaxed max-w-xs">
              The payment gateway that can&apos;t deplatform you.
            </p>
            <p className="mt-4 font-mono text-[10px] text-muted tracking-wider">
              Non-custodial. Open source. Self-hostable.
            </p>
          </div>

          {/* Link columns */}
          {Object.entries(FOOTER_LINKS).map(([category, links]) => (
            <div key={category}>
              <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted mb-4">
                {category}
              </p>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-foreground-secondary hover:text-foreground transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-16 flex flex-col items-center justify-between gap-4 border-t border-border pt-8 sm:flex-row">
          <p className="text-[11px] text-muted">
            &copy; {new Date().getFullYear()} neetpay. All rights reserved.
          </p>
          <p className="font-mono text-[10px] text-muted tracking-wider">
            permissionless payments infrastructure
          </p>
        </div>
      </div>
    </footer>
  );
}
