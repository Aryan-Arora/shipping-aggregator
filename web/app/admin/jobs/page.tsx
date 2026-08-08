"use client";

import { useEffect, useState } from "react";
import { apiGet, apiPost } from "@/lib/api";

interface RetryQueueEntry {
  id: string;
  operation_type: string;
  courier_code: string;
  awb: string | null;
  attempts: number;
  max_attempts: number;
  status: string;
  last_error: string | null;
  created_at: string;
  updated_at: string;
}

const muted = { color: "var(--color-text-secondary)" };
const primary = { color: "var(--color-text-primary)" };

function JobCard({
  title,
  description,
  endpoint,
}: {
  title: string;
  description: string;
  endpoint: string;
}) {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setRunning(true);
    setError(null);
    try {
      setResult(await apiPost<Record<string, unknown>>(endpoint, {}));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Job failed");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="card p-5">
      <h2 className="font-medium" style={primary}>
        {title}
      </h2>
      <p className="mt-1 text-[0.8rem]" style={muted}>
        {description}
      </p>
      <button onClick={run} disabled={running} className="btn-secondary mt-3">
        {running ? "Running..." : "Run now"}
      </button>
      {error && (
        <p className="mt-3 text-[0.8rem]" style={{ color: "var(--color-danger)" }}>
          {error}
        </p>
      )}
      {result && (
        <dl className="mt-3 space-y-1 text-[0.8rem]" style={muted}>
          {Object.entries(result).map(([key, value]) => (
            <div key={key} className="flex justify-between gap-4">
              <dt>{key}</dt>
              <dd style={primary}>{String(value)}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

export default function AdminJobsPage() {
  const [queue, setQueue] = useState<RetryQueueEntry[]>([]);
  const [loadingQueue, setLoadingQueue] = useState(true);

  async function loadQueue() {
    setLoadingQueue(true);
    try {
      setQueue(await apiGet<RetryQueueEntry[]>("/admin/jobs/retry-queue"));
    } finally {
      setLoadingQueue(false);
    }
  }

  useEffect(() => {
    loadQueue();
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight" style={primary}>
        Background Jobs
      </h1>
      <p className="mt-1 text-[0.85rem]" style={muted}>
        No cron infrastructure yet — these run on an interval in the API process, and can be triggered
        manually here.
      </p>

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <JobCard
          title="Tracking Reconciliation"
          description="Poll couriers directly for any shipment with no status update in a while — a webhook fallback."
          endpoint="/admin/jobs/tracking-reconciliation"
        />
        <JobCard
          title="Retry Queue"
          description="Retry courier calls that failed and got queued (e.g. a tracking poll that errored)."
          endpoint="/admin/jobs/retry-queue/process"
        />
        <JobCard
          title="COD Reconciliation"
          description="Recompute this month's expected COD amount per courier from booked shipments."
          endpoint="/admin/jobs/cod-reconciliation"
        />
      </div>

      <div className="mt-8 flex items-center justify-between">
        <h2 className="text-[0.8rem] font-semibold uppercase tracking-wide" style={muted}>
          Retry queue
        </h2>
        <button onClick={loadQueue} className="text-[0.75rem] font-medium hover:underline" style={{ color: "var(--color-accent)" }}>
          Refresh
        </button>
      </div>

      <div className="table-shell mt-3">
        <table>
          <thead>
            <tr>
              <th>Operation</th>
              <th>Courier</th>
              <th>AWB</th>
              <th>Attempts</th>
              <th>Status</th>
              <th>Last error</th>
            </tr>
          </thead>
          <tbody>
            {loadingQueue ? (
              <tr>
                <td colSpan={6} style={muted}>
                  Loading...
                </td>
              </tr>
            ) : queue.length === 0 ? (
              <tr>
                <td colSpan={6} style={muted}>
                  Nothing queued.
                </td>
              </tr>
            ) : (
              queue.map((entry) => (
                <tr key={entry.id}>
                  <td style={muted}>{entry.operation_type}</td>
                  <td style={muted}>{entry.courier_code}</td>
                  <td className="font-mono text-[0.7rem]" style={muted}>
                    {entry.awb ?? "—"}
                  </td>
                  <td style={muted}>
                    {entry.attempts}/{entry.max_attempts}
                  </td>
                  <td>
                    <span
                      className="badge"
                      style={
                        entry.status === "succeeded"
                          ? { backgroundColor: "var(--color-success-soft)", color: "var(--color-success)" }
                          : entry.status === "abandoned"
                            ? { backgroundColor: "var(--color-danger-soft)", color: "var(--color-danger)" }
                            : { backgroundColor: "var(--color-warning-soft)", color: "var(--color-warning)" }
                      }
                    >
                      {entry.status}
                    </span>
                  </td>
                  <td className="max-w-xs truncate text-[0.75rem]" style={muted} title={entry.last_error ?? ""}>
                    {entry.last_error ?? "—"}
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
