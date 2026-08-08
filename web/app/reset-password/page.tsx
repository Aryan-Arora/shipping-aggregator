"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    // Supabase parses the recovery token out of the URL fragment on load
    // and fires this event once the resulting session is ready — only then
    // is updateUser() actually allowed to change the password.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        setReady(true);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });

    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setDone(true);
    setTimeout(() => {
      router.push("/dashboard");
      router.refresh();
    }, 1500);
  }

  return (
    <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: "var(--color-bg)" }}>
      <div className="card animate-in w-full max-w-sm p-8">
        <h1 className="mb-6 text-xl font-semibold tracking-tight" style={{ color: "var(--color-text-primary)" }}>
          Set a new password
        </h1>
        {done ? (
          <p className="text-[0.9rem]" style={{ color: "var(--color-success)" }}>
            Password updated — taking you to your dashboard.
          </p>
        ) : !ready ? (
          <p className="text-[0.85rem]" style={{ color: "var(--color-text-secondary)" }}>
            Verifying your reset link...
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">New password</label>
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
              {loading ? "Saving..." : "Save new password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
