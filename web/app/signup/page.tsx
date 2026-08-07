"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const router = useRouter();
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { company_name: companyName } },
    });

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
          Create your seller account
        </h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Company name</label>
            <input
              type="text"
              required
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="field"
            />
          </div>
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
            <label className="label">Password</label>
            <input
              type="password"
              required
              minLength={6}
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
            {loading ? "Signing up..." : "Sign up"}
          </button>
        </form>
        <p className="mt-5 text-center text-[0.85rem]" style={{ color: "var(--color-text-secondary)" }}>
          Already have an account?{" "}
          <Link href="/login" style={{ color: "var(--color-accent)" }} className="font-medium hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
