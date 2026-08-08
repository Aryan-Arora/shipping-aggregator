"use client";

import { useEffect, useState } from "react";
import { apiGet, apiPatch } from "@/lib/api";

interface Courier {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
  isMock: boolean;
  totalShipments: number;
  deliverySuccessRate: number | null;
  ndrRate: number | null;
}

const muted = { color: "var(--color-text-secondary)" };
const primary = { color: "var(--color-text-primary)" };

export default function AdminCouriersPage() {
  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      setCouriers(await apiGet<Courier[]>("/admin/couriers"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load couriers");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function toggleActive(courier: Courier) {
    setActingId(courier.id);
    try {
      await apiPatch(`/admin/couriers/${courier.id}`, { is_active: !courier.isActive });
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
        Couriers
      </h1>
      <p className="mt-1 text-[0.85rem]" style={muted}>
        Enable or disable couriers platform-wide and track performance.
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
              <th>Courier</th>
              <th>Code</th>
              <th>Shipments</th>
              <th>Delivery success</th>
              <th>NDR rate</th>
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
            ) : (
              couriers.map((c) => (
                <tr key={c.id}>
                  <td className="font-medium" style={primary}>
                    {c.name}
                    {c.isMock && (
                      <span className="ml-2 text-[0.7rem]" style={{ color: "var(--color-text-tertiary)" }}>
                        mock
                      </span>
                    )}
                  </td>
                  <td className="font-mono text-[0.75rem]" style={muted}>
                    {c.code}
                  </td>
                  <td style={muted}>{c.totalShipments}</td>
                  <td style={muted}>{c.deliverySuccessRate !== null ? `${c.deliverySuccessRate}%` : "—"}</td>
                  <td style={{ color: (c.ndrRate ?? 0) > 20 ? "var(--color-warning)" : "var(--color-text-secondary)" }}>
                    {c.ndrRate !== null ? `${c.ndrRate}%` : "—"}
                  </td>
                  <td>
                    <span
                      className="badge"
                      style={
                        c.isActive
                          ? { backgroundColor: "var(--color-success-soft)", color: "var(--color-success)" }
                          : { backgroundColor: "var(--color-danger-soft)", color: "var(--color-danger)" }
                      }
                    >
                      {c.isActive ? "Active" : "Disabled"}
                    </span>
                  </td>
                  <td className="text-right">
                    <button
                      disabled={actingId === c.id}
                      onClick={() => toggleActive(c)}
                      className="text-[0.75rem] font-medium hover:underline disabled:opacity-50"
                      style={{ color: c.isActive ? "var(--color-danger)" : "var(--color-accent)" }}
                    >
                      {c.isActive ? "Disable" : "Enable"}
                    </button>
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
