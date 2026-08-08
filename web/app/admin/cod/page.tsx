"use client";

import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api";

interface CodRow {
  id: string;
  courierName: string;
  periodStart: string;
  periodEnd: string;
  expectedAmount: number;
  remittedAmount: number;
  variance: number;
  flagged: boolean;
  remittedAt: string | null;
}

const muted = { color: "var(--color-text-secondary)" };
const primary = { color: "var(--color-text-primary)" };

export default function AdminCodPage() {
  const [rows, setRows] = useState<CodRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiGet<CodRow[]>("/admin/cod")
      .then(setRows)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load COD data"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight" style={primary}>
        Platform COD Reconciliation
      </h1>
      <p className="mt-1 text-[0.85rem]" style={muted}>
        Every courier remittance period, platform-wide.
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
              <th>Period</th>
              <th>Expected</th>
              <th>Remitted</th>
              <th>Variance</th>
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
                  No remittance records yet.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id}>
                  <td className="font-medium" style={primary}>
                    {r.courierName}
                  </td>
                  <td style={muted}>
                    {new Date(r.periodStart).toLocaleDateString()} –{" "}
                    {new Date(r.periodEnd).toLocaleDateString()}
                  </td>
                  <td style={muted}>₹{r.expectedAmount.toFixed(0)}</td>
                  <td style={muted}>₹{r.remittedAmount.toFixed(0)}</td>
                  <td style={{ color: r.variance > 0 ? "var(--color-danger)" : "var(--color-text-secondary)" }}>
                    ₹{r.variance.toFixed(0)}
                  </td>
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
