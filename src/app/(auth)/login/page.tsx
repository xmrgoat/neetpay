"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { requestMagicLink, pollMagicLink, setToken } from "@/hooks/useAuth";

type State = "idle" | "loading" | "sent" | "error";

export default function LoginPage() {
  const [state, setState] = useState<State>("idle");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sessionCode, setSessionCode] = useState("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const router = useRouter();

  // Poll for cross-device auth when in "sent" state.
  useEffect(() => {
    if (state !== "sent" || !sessionCode) return;

    pollRef.current = setInterval(async () => {
      const result = await pollMagicLink(sessionCode);
      if (result.status === "authenticated" && result.token) {
        // Got the JWT — user clicked the link on another device.
        setToken(result.token);
        if (pollRef.current) clearInterval(pollRef.current);
        if (result.is_new) {
          router.push("/onboarding");
        } else {
          router.push("/dashboard");
        }
      }
    }, 2500);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [state, sessionCode, router]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setState("loading");

    const result = await requestMagicLink(email);

    if (!result.ok) {
      setError(result.error || "Something went wrong");
      setState("error");
      return;
    }

    setSessionCode(result.session_code || "");
    setState("sent");
  }

  if (state === "sent") {
    return (
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-success-muted">
          <svg className="h-6 w-6 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <h2 className="font-heading text-xl font-semibold tracking-tight text-foreground">
          Check your inbox
        </h2>
        <p className="mt-3 text-sm text-foreground-secondary leading-relaxed">
          A login link valid for 15 minutes has been sent to{" "}
          <span className="font-medium text-foreground">{email}</span>.
        </p>
        <p className="mt-4 text-xs text-muted leading-relaxed">
          Click the link on any device — this page will update automatically.
        </p>

        {/* Polling indicator */}
        <div className="mt-6 flex items-center justify-center gap-2">
          <div className="h-2 w-2 animate-pulse rounded-full bg-primary" />
          <span className="text-xs text-muted">Waiting for confirmation...</span>
        </div>

        <button
          onClick={() => {
            if (pollRef.current) clearInterval(pollRef.current);
            setState("idle");
            setEmail("");
            setSessionCode("");
          }}
          className="mt-6 text-sm text-primary hover:underline"
        >
          Use a different email
        </button>
      </div>
    );
  }

  return (
    <>
      <h1 className="font-heading text-2xl font-semibold tracking-tight">
        Welcome back
      </h1>
      <p className="mt-2 text-sm text-foreground-secondary">
        Sign in to your neetpay account
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <Input
          label="Email"
          name="email"
          type="email"
          placeholder="you@example.com"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        {(state === "error" && error) && (
          <div className="rounded-lg border border-error/20 bg-error-muted px-3 py-2">
            <p className="text-sm text-error">{error}</p>
          </div>
        )}

        <Button
          type="submit"
          className="w-full h-10"
          loading={state === "loading"}
        >
          {state === "loading" ? "Sending..." : "Get login link"}
        </Button>
      </form>

      <p className="mt-6 text-xs text-muted leading-relaxed">
        We&apos;ll send you a magic link — no password needed.
      </p>
    </>
  );
}
