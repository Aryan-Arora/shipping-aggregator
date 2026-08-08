"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: "var(--color-bg)" }}>
      <div className="card animate-in w-full max-w-sm p-8">
        <h1 className="mb-6 text-xl font-semibold tracking-tight" style={{ color: "var(--color-text-primary)" }}>
          Log in
        </h1>
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
          <div>
            <div className="flex items-center justify-between">
              <label className="label">Password</label>
              <Link
                href="/forgot-password"
                className="mb-1.5 text-[0.8rem] font-medium hover:underline"
                style={{ color: "var(--color-accent)" }}
              >
                Forgot password?
              </Link>
            </div>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="field"
            />
          </div>
          {error && (
            <p className="text-[0.8rem]" style={{ color: "var(--color-danger)" }}>
              {error}
            </p>
          )}
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? "Logging in..." : "Log in"}
          </button>
        </form>
        <p className="mt-5 text-center text-[0.85rem]" style={{ color: "var(--color-text-secondary)" }}>
          No account?{" "}
          <Link href="/signup" style={{ color: "var(--color-accent)" }} className="font-medium hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
