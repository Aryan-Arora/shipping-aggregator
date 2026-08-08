"use client";

import { useEffect, useState } from "react";
import { apiGet, apiPatch } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";

interface Seller {
  id: string;
  company_name: string;
  email: string;
  phone: string | null;
  role: "seller" | "admin";
  is_active: boolean;
  created_at: string;
}

const muted = { color: "var(--color-text-secondary)" };
const primary = { color: "var(--color-text-primary)" };

export default function AdminSellersPage() {
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);
  const [currentEmail, setCurrentEmail] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      setSellers(await apiGet<Seller[]>("/admin/sellers"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load sellers");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setCurrentEmail(user?.email ?? null);
    })();
  }, []);

  async function toggleActive(seller: Seller) {
    setActingId(seller.id);
    try {
      await apiPatch(`/admin/sellers/${seller.id}`, { is_active: !seller.is_active });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setActingId(null);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight" style={primary}>
        Sellers
      </h1>
      <p className="mt-1 text-[0.85rem]" style={muted}>
        Every seller on the platform.
      </p>

      {error && (
        <p className="mt-4 text-[0.8rem]" style={{ color: "var(--color-danger)" }}>
          {error}
        </p>
      )}

      <div className="table-shell mt-5">
        <table>
          <thead>
            <tr>
              <th>Company</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Role</th>
              <th>Joined</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={muted}>
                  Loading...
                </td>
              </tr>
            ) : sellers.length === 0 ? (
              <tr>
                <td colSpan={7} style={muted}>
                  No sellers yet.
                </td>
              </tr>
            ) : (
              sellers.map((s) => (
                <tr key={s.id}>
                  <td className="font-medium" style={primary}>
                    {s.company_name}
                  </td>
                  <td style={muted}>{s.email}</td>
                  <td style={muted}>{s.phone ?? "—"}</td>
                  <td>
                    <span
                      className="badge"
                      style={{ backgroundColor: "var(--color-bg)", color: "var(--color-text-secondary)" }}
                    >
                      {s.role}
                    </span>
                  </td>
                  <td style={muted}>{new Date(s.created_at).toLocaleDateString()}</td>
                  <td>
                    <span
                      className="badge"
                      style={
                        s.is_active
                          ? { backgroundColor: "var(--color-success-soft)", color: "var(--color-success)" }
                          : { backgroundColor: "var(--color-danger-soft)", color: "var(--color-danger)" }
                      }
                    >
                      {s.is_active ? "Active" : "Deactivated"}
                    </span>
                  </td>
                  <td className="text-right">
                    {s.email === currentEmail ? (
                      <span className="text-[0.75rem]" style={muted}>
                        You
                      </span>
                    ) : (
                      <button
                        disabled={actingId === s.id}
                        onClick={() => toggleActive(s)}
                        className="text-[0.75rem] font-medium hover:underline disabled:opacity-50"
                        style={{ color: s.is_active ? "var(--color-danger)" : "var(--color-accent)" }}
                      >
                        {s.is_active ? "Deactivate" : "Activate"}
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
