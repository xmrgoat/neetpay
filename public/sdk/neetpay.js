/**
 * neetpay Checkout SDK v1.0
 * Embed crypto payment checkout on any website.
 *
 * Usage:
 *   <script src="https://yourdomain.com/sdk/neetpay.js"></script>
 *   <script>
 *     NeetPay.init({ apiKey: "pk_live_..." });
 *     NeetPay.openCheckout({ trackId: "vp_abc123" });
 *   </script>
 */
(function (global) {
  "use strict";

  var BASE_URL = "";
  var API_KEY = "";

  var overlay = null;
  var iframe = null;
  var callbacks = {};

  function init(opts) {
    if (!opts || !opts.apiKey) {
      console.error("[NeetPay] apiKey is required");
      return;
    }
    if (opts.apiKey.indexOf("sk_live_") === 0) {
      console.warn("[NeetPay] WARNING: You are using a secret key in the browser. Use a pk_live_ publishable key instead.");
    }
    API_KEY = opts.apiKey;
    BASE_URL = opts.baseUrl || detectBaseUrl();
  }

  function detectBaseUrl() {
    var scripts = document.getElementsByTagName("script");
    for (var i = 0; i < scripts.length; i++) {
      var src = scripts[i].src || "";
      if (src.indexOf("/sdk/neetpay.js") !== -1) {
        return src.replace("/sdk/neetpay.js", "");
      }
    }
    return "";
  }

  /**
   * Create a payment and open the checkout modal.
   * @param {Object} opts
   * @param {string} [opts.trackId] — Open existing payment
   * @param {number} [opts.amount] — Create new payment
   * @param {string} [opts.currency]
   * @param {string} [opts.payCurrencyKey]
   * @param {string} [opts.description]
   * @param {Object} [opts.metadata]
   * @param {string} [opts.returnUrl]
   * @param {string} [opts.callbackUrl]
   * @param {Function} [opts.onSuccess]
   * @param {Function} [opts.onExpired]
   * @param {Function} [opts.onClose]
   */
  function openCheckout(opts) {
    if (!opts) {
      console.error("[NeetPay] openCheckout requires options");
      return;
    }

    callbacks = {
      onSuccess: opts.onSuccess || noop,
      onExpired: opts.onExpired || noop,
      onClose: opts.onClose || noop,
    };

    if (opts.trackId) {
      showModal(opts.trackId);
    } else if (opts.amount && opts.payCurrencyKey) {
      createAndShow(opts);
    } else {
      console.error("[NeetPay] Provide trackId or (amount + payCurrencyKey)");
    }
  }

  function createAndShow(opts) {
    var body = {
      amount: opts.amount,
      currency: opts.currency || "USD",
      payCurrencyKey: opts.payCurrencyKey,
      description: opts.description,
      metadata: opts.metadata,
      returnUrl: opts.returnUrl,
      callbackUrl: opts.callbackUrl,
    };

    fetch(BASE_URL + "/api/v1/payment/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": API_KEY,
      },
      body: JSON.stringify(body),
    })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        var payload = data.data || data;
        if (payload.trackId) {
          showModal(payload.trackId);
        } else {
          console.error("[NeetPay] Payment creation failed:", data.message || data.error);
        }
      })
      .catch(function (err) {
        console.error("[NeetPay] Network error:", err);
      });
  }

  function showModal(trackId) {
    closeModal();

    overlay = document.createElement("div");
    overlay.style.cssText =
      "position:fixed;inset:0;z-index:999999;background:rgba(0,0,0,0.6);" +
      "display:flex;align-items:center;justify-content:center;";
    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) closeModal();
    });

    iframe = document.createElement("iframe");
    iframe.src = BASE_URL + "/pay/" + trackId + "?embed=1";
    iframe.style.cssText =
      "width:100%;max-width:440px;height:680px;border:none;border-radius:12px;" +
      "background:#111;";
    iframe.allow = "clipboard-write";

    overlay.appendChild(iframe);
    document.body.appendChild(overlay);

    // Listen for postMessage from checkout
    window.addEventListener("message", handleMessage);

    // Poll status for events
    startPolling(trackId);
  }

  var pollInterval = null;

  function startPolling(trackId) {
    stopPolling();
    pollInterval = setInterval(function () {
      fetch(BASE_URL + "/api/v1/payment/" + trackId + "/status")
        .then(function (r) { return r.json(); })
        .then(function (data) {
          var payload = data.data || data;
          if (payload.status === "paid") {
            stopPolling();
            callbacks.onSuccess(payload);
          } else if (payload.status === "expired") {
            stopPolling();
            callbacks.onExpired(payload);
          }
        })
        .catch(noop);
    }, 5000);
  }

  function stopPolling() {
    if (pollInterval) {
      clearInterval(pollInterval);
      pollInterval = null;
    }
  }

  function handleMessage(e) {
    if (!e.data || e.data.source !== "neetpay") return;
    if (e.data.event === "close") closeModal();
    if (e.data.event === "paid") callbacks.onSuccess(e.data);
    if (e.data.event === "expired") callbacks.onExpired(e.data);
  }

  function closeModal() {
    stopPolling();
    window.removeEventListener("message", handleMessage);
    if (overlay && overlay.parentNode) {
      overlay.parentNode.removeChild(overlay);
    }
    overlay = null;
    iframe = null;
    callbacks.onClose && callbacks.onClose();
  }

  function noop() {}

  // Public API
  global.NeetPay = {
    init: init,
    openCheckout: openCheckout,
    closeCheckout: closeModal,
  };
})(typeof window !== "undefined" ? window : this);
