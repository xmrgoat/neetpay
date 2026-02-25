"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    const res = await fetch("/api/user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Something went wrong");
      return;
    }

    router.push("/login");
  }

  return (
    <>
      <h1 className="font-heading text-2xl font-semibold tracking-tight">
        Create your account
      </h1>
      <p className="mt-2 text-sm text-foreground-secondary">
        Start accepting crypto payments in minutes
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <Input
          label="Email"
          name="email"
          type="email"
          placeholder="you@example.com"
          required
          autoComplete="email"
        />
        <Input
          label="Password"
          name="password"
          type="password"
          placeholder="6+ characters"
          required
          autoComplete="new-password"
          minLength={6}
        />
        <Input
          label="Confirm password"
          name="confirmPassword"
          type="password"
          placeholder="Repeat your password"
          required
          autoComplete="new-password"
          minLength={6}
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
          {loading ? "Creating account..." : "Create account"}
        </Button>
      </form>

      {/* Trust signals */}
      <div className="mt-6 flex items-center gap-4 text-[11px] text-muted">
        <span>No KYC required</span>
        <span className="h-3 w-px bg-border" />
        <span>Email-only signup</span>
        <span className="h-3 w-px bg-border" />
        <span>Free tier</span>
      </div>

      <p className="mt-6 text-sm text-foreground-secondary">
        Already have an account?{" "}
        <Link href="/login" className="text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </>
  );
}
