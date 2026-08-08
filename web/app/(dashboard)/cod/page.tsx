"use client";

import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api";

interface CodRow {
  courierId: string;
  courierName: string;
  expectedAmount: number;
  remittedAmount: number;
  variance: number;
  flagged: boolean;
  remittedAt: string | null;
}

const muted = { color: "var(--color-text-secondary)" };
const primary = { color: "var(--color-text-primary)" };

export default function CodPage() {
  const [rows, setRows] = useState<CodRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await apiGet<CodRow[]>("/cod/reconciliation");
        setRows(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load COD reconciliation");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const totalExpected = rows.reduce((sum, r) => sum + r.expectedAmount, 0);
  const totalRemitted = rows.reduce((sum, r) => sum + r.remittedAmount, 0);

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight" style={primary}>
        COD Reconciliation
      </h1>
      <p className="mt-1 text-[0.85rem]" style={muted}>
        Expected vs. remitted COD amounts per courier, based on your COD shipments.
      </p>

      {error && (
        <p className="mt-4 text-[0.8rem]" style={{ color: "var(--color-danger)" }}>
          {error}
        </p>
      )}

      {!loading && rows.length > 0 && (
        <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div className="card p-5">
            <p className="text-[0.75rem] font-medium uppercase tracking-wide" style={muted}>
              Total expected
            </p>
            <p className="mt-2 text-2xl font-semibold tracking-tight" style={primary}>
              ₹{totalExpected.toFixed(0)}
            </p>
          </div>
          <div className="card p-5">
            <p className="text-[0.75rem] font-medium uppercase tracking-wide" style={muted}>
              Total remitted
            </p>
            <p className="mt-2 text-2xl font-semibold tracking-tight" style={{ color: "var(--color-success)" }}>
              ₹{totalRemitted.toFixed(0)}
            </p>
          </div>
          <div className="card p-5">
            <p className="text-[0.75rem] font-medium uppercase tracking-wide" style={muted}>
              Outstanding
            </p>
            <p className="mt-2 text-2xl font-semibold tracking-tight" style={{ color: "var(--color-danger)" }}>
              ₹{(totalExpected - totalRemitted).toFixed(0)}
            </p>
          </div>
        </div>
      )}

      <div className="table-shell mt-5">
        <table>
          <thead>
            <tr>
              <th>Courier</th>
              <th>Expected</th>
              <th>Remitted</th>
              <th>Variance</th>
              <th>Last remitted</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} style={muted}>
                  Loading...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={6} style={muted}>
                  No COD shipments yet.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.courierId}>
                  <td className="font-medium" style={primary}>
                    {r.courierName}
                  </td>
                  <td style={muted}>₹{r.expectedAmount.toFixed(0)}</td>
                  <td style={muted}>₹{r.remittedAmount.toFixed(0)}</td>
                  <td style={{ color: r.variance > 0 ? "var(--color-danger)" : "var(--color-text-secondary)" }}>
                    ₹{r.variance.toFixed(0)}
                  </td>
                  <td style={muted}>{r.remittedAt ? new Date(r.remittedAt).toLocaleDateString() : "—"}</td>
                  <td>
                    <span
                      className="badge"
                      style={
                        r.flagged
                          ? { backgroundColor: "var(--color-danger-soft)", color: "var(--color-danger)" }
                          : { backgroundColor: "var(--color-success-soft)", color: "var(--color-success)" }
                      }
                    >
                      {r.flagged ? "Flagged" : "Reconciled"}
                    </span>
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
