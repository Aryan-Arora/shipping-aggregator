"use client";

import { useEffect, useState } from "react";
import { apiGet, apiPatch, apiPost } from "@/lib/api";

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
  const [generating, setGenerating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [remittedInput, setRemittedInput] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      setRows(await apiGet<CodRow[]>("/admin/cod"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load COD data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    try {
      await apiPost("/admin/jobs/cod-reconciliation", {});
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate expected amounts");
    } finally {
      setGenerating(false);
    }
  }

  function startEditing(row: CodRow) {
    setEditingId(row.id);
    setRemittedInput(String(row.remittedAmount));
  }

  async function saveRemittance(id: string) {
    const amount = Number(remittedInput);
    if (Number.isNaN(amount)) return;
    setSaving(true);
    setError(null);
    try {
      await apiPatch(`/admin/cod/remittances/${id}`, { remittedAmount: amount });
      setEditingId(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to record remittance");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight" style={primary}>
            Platform COD Reconciliation
          </h1>
          <p className="mt-1 text-[0.85rem]" style={muted}>
            Every courier remittance period, platform-wide.
          </p>
        </div>
        <button onClick={handleGenerate} disabled={generating} className="btn-secondary">
          {generating ? "Generating..." : "Generate this month's expected amounts"}
        </button>
      </div>

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
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={7} style={muted}>
                  No remittance records yet — try generating this month's expected amounts above.
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
                  <td>
                    {editingId === r.id ? (
                      <input
                        type="number"
                        value={remittedInput}
                        onChange={(e) => setRemittedInput(e.target.value)}
                        className="field w-28 py-1"
                        autoFocus
                      />
                    ) : (
                      <span style={muted}>₹{r.remittedAmount.toFixed(0)}</span>
                    )}
                  </td>
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
                  <td className="text-right">
                    {editingId === r.id ? (
                      <div className="flex justify-end gap-3">
                        <button
                          disabled={saving}
                          onClick={() => saveRemittance(r.id)}
                          className="text-[0.75rem] font-medium hover:underline disabled:opacity-50"
                          style={{ color: "var(--color-accent)" }}
                        >
                          Save
                        </button>
                        <button
                          disabled={saving}
                          onClick={() => setEditingId(null)}
                          className="text-[0.75rem] font-medium hover:underline disabled:opacity-50"
                          style={muted}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => startEditing(r)}
                        className="text-[0.75rem] font-medium hover:underline"
                        style={{ color: "var(--color-accent)" }}
                      >
                        Record remittance
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
