"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setSent(true);
  }

  return (
    <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: "var(--color-bg)" }}>
      <div className="card animate-in w-full max-w-sm p-8">
        <h1 className="mb-2 text-xl font-semibold tracking-tight" style={{ color: "var(--color-text-primary)" }}>
          Reset your password
        </h1>
        {sent ? (
          <p className="mt-4 text-[0.9rem]" style={{ color: "var(--color-text-secondary)" }}>
            If an account exists for <strong>{email}</strong>, we&apos;ve sent a link to reset the password.
          </p>
        ) : (
          <>
            <p className="mb-6 text-[0.85rem]" style={{ color: "var(--color-text-secondary)" }}>
              Enter your email and we&apos;ll send you a reset link.
            </p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="field"
                />
              </div>
              {error && (
                <p className="text-[0.8rem]" style={{ color: "var(--color-danger)" }}>
                  {error}
                </p>
              )}
              <button type="submit" disabled={loading} className="btn-primary w-full">
                {loading ? "Sending..." : "Send reset link"}
              </button>
            </form>
          </>
        )}
        <p className="mt-5 text-center text-[0.85rem]" style={{ color: "var(--color-text-secondary)" }}>
          <Link href="/login" style={{ color: "var(--color-accent)" }} className="font-medium hover:underline">
            Back to log in
          </Link>
        </p>
      </div>
    </div>
  );
}
