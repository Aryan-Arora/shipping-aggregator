"use client";

import { useEffect, useState } from "react";
import { apiGet, apiPost } from "@/lib/api";
import { StatusBadge } from "@/components/StatusBadge";

interface NdrCase {
  id: string;
  reason: string | null;
  attempts: number;
  status: string;
  escalated: boolean;
  createdAt: string;
  awb: string;
  courierName: string;
  orderRef: string;
  customerName: string;
}

const muted = { color: "var(--color-text-secondary)" };
const primary = { color: "var(--color-text-primary)" };

function daysPending(createdAt: string) {
  const ms = Date.now() - new Date(createdAt).getTime();
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
}

export default function NdrPage() {
  const [cases, setCases] = useState<NdrCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const data = await apiGet<NdrCase[]>("/ndr");
      setCases(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load NDR cases");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleAction(id: string, action: "reattempt" | "cancel" | "resolve" | "escalate") {
    setActingId(id);
    setError(null);
    try {
      await apiPost(`/ndr/${id}/${action}`, {});
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setActingId(null);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight" style={primary}>
        NDR Management
      </h1>
      <p className="mt-1 text-[0.85rem]" style={muted}>
        Failed delivery attempts flagged by couriers, waiting on action.
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
              <th>Order / AWB</th>
              <th>Courier</th>
              <th>Reason</th>
              <th>Attempts</th>
              <th>Days pending</th>
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
            ) : cases.length === 0 ? (
              <tr>
                <td colSpan={7} style={muted}>
                  No NDR cases — nothing needs your attention.
                </td>
              </tr>
            ) : (
              cases.map((c) => (
                <tr key={c.id}>
                  <td>
                    <p className="font-medium" style={primary}>
                      {c.orderRef}
                    </p>
                    <p className="font-mono text-[0.7rem]" style={muted}>
                      {c.awb}
                    </p>
                  </td>
                  <td style={muted}>{c.courierName}</td>
                  <td style={muted}>{c.reason ?? "—"}</td>
                  <td style={muted}>{c.attempts}</td>
                  <td style={muted}>{daysPending(c.createdAt)}d</td>
                  <td>
                    <div className="flex items-center gap-1.5">
                      <StatusBadge status={c.status} />
                      {c.escalated && <StatusBadge status="failed" />}
                    </div>
                  </td>
                  <td className="text-right">
                    {c.status === "open" || c.status === "reattempt_scheduled" ? (
                      <div className="flex justify-end gap-3">
                        <button
                          disabled={actingId === c.id}
                          onClick={() => handleAction(c.id, "reattempt")}
                          className="text-[0.75rem] font-medium hover:underline disabled:opacity-50"
                          style={{ color: "var(--color-accent)" }}
                        >
                          Reattempt
                        </button>
                        {!c.escalated && (
                          <button
                            disabled={actingId === c.id}
                            onClick={() => handleAction(c.id, "escalate")}
                            className="text-[0.75rem] font-medium hover:underline disabled:opacity-50"
                            style={{ color: "var(--color-warning)" }}
                          >
                            Escalate
                          </button>
                        )}
                        <button
                          disabled={actingId === c.id}
                          onClick={() => handleAction(c.id, "cancel")}
                          className="text-[0.75rem] font-medium hover:underline disabled:opacity-50"
                          style={{ color: "var(--color-danger)" }}
                        >
                          Cancel (RTO)
                        </button>
                      </div>
                    ) : (
                      <span className="text-[0.75rem]" style={muted}>
                        —
                      </span>
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
