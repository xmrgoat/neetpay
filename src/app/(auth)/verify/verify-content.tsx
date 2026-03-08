"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { verifyMagicLink } from "@/hooks/useAuth";
import Link from "next/link";

type State = "verifying" | "success" | "error";

export default function VerifyContent() {
  const [state, setState] = useState<State>("verifying");
  const [error, setError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    const email = params.get("email");

    if (!token || !email) {
      setError("Missing token or email");
      setState("error");
      return;
    }

    verifyMagicLink(token, email).then((result) => {
      if (!result.ok) {
        setError(result.error || "Invalid or expired link");
        setState("error");
        return;
      }

      setState("success");

      if (result.is_new) {
        window.location.href = "/onboarding";
      } else {
        window.location.href = "/dashboard";
      }
    });
  }, []);

  if (state === "verifying") {
    return (
      <div className="text-center">
        <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary" />
        <h2 className="font-heading text-xl font-semibold tracking-tight text-foreground">
          Verifying your link...
        </h2>
        <p className="mt-2 text-sm text-foreground-secondary">
          Please wait a moment.
        </p>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-error-muted">
          <svg className="h-6 w-6 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h2 className="font-heading text-xl font-semibold tracking-tight text-foreground">
          Link expired or invalid
        </h2>
        <p className="mt-2 text-sm text-foreground-secondary">
          {error}
        </p>
        <Link href="/login">
          <Button className="mt-6 w-full h-10">
            Request a new link
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-success-muted">
        <svg className="h-6 w-6 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h2 className="font-heading text-xl font-semibold tracking-tight text-foreground">
        You&apos;re in
      </h2>
      <p className="mt-2 text-sm text-foreground-secondary">
        Redirecting to dashboard...
      </p>
    </div>
  );
}
