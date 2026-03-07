"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { authFetch } from "@/hooks/useAuth";

export default function OnboardingPage() {
  const router = useRouter();
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Basic XMR address validation (starts with 4, 95 chars for main / 106 for integrated).
    const trimmed = address.trim();
    if (trimmed && !(/^4[0-9A-Za-z]{94}$/.test(trimmed) || /^4[0-9A-Za-z]{105}$/.test(trimmed))) {
      setError("Invalid Monero address format");
      setLoading(false);
      return;
    }

    try {
      const res = await authFetch("/v1/merchants/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ xmr_wallet_address: trimmed }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to save address");
        setLoading(false);
        return;
      }
    } catch {
      setError("Network error");
      setLoading(false);
      return;
    }

    router.push("/dashboard");
  }

  function handleSkip() {
    router.push("/dashboard");
  }

  return (
    <>
      <h1 className="font-heading text-2xl font-semibold tracking-tight">
        Almost there
      </h1>
      <p className="mt-2 text-sm text-foreground-secondary leading-relaxed">
        Enter your Monero address to receive payments.
        <br />
        You can also set this up later in Settings.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <Input
          label="XMR wallet address"
          name="xmr_address"
          type="text"
          placeholder="4..."
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          autoComplete="off"
          hint="Your primary Monero address (starts with 4)"
        />

        {error && (
          <div className="rounded-lg border border-error/20 bg-error-muted px-3 py-2">
            <p className="text-sm text-error">{error}</p>
          </div>
        )}

        <Button
          type="submit"
          className="w-full h-10"
          loading={loading}
        >
          {loading ? "Saving..." : "Continue to dashboard"}
        </Button>
      </form>

      <button
        onClick={handleSkip}
        className="mt-4 w-full text-center text-sm text-muted hover:text-foreground-secondary transition-colors"
      >
        Skip for now
      </button>
    </>
  );
}
