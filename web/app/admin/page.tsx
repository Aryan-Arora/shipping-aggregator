"use client";

import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api";

interface PlatformStats {
  totalSellers: number;
  totalShipments: number;
  inTransit: number;
  delivered: number;
  ndrOpen: number;
  volumeTrend: { date: string; count: number }[];
}

const muted = { color: "var(--color-text-secondary)" };
const primary = { color: "var(--color-text-primary)" };

function StatCard({ label, value, accent }: { label: string; value: string | number; accent?: string }) {
  return (
    <div className="card p-5">
      <p className="text-[0.75rem] font-medium uppercase tracking-wide" style={muted}>
        {label}
      </p>
      <p className="mt-2 text-3xl font-semibold tracking-tight" style={{ color: accent ?? "var(--color-text-primary)" }}>
        {value}
      </p>
    </div>
  );
}

export default function AdminOverviewPage() {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setStats(await apiGet<PlatformStats>("/admin/stats"));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load platform stats");
      }
    })();
  }, []);

  const maxVolume = Math.max(1, ...(stats?.volumeTrend.map((v) => v.count) ?? [1]));

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight" style={primary}>
        Platform Overview
      </h1>
      <p className="mt-1 text-[0.85rem]" style={muted}>
        Aggregate stats across every seller.
      </p>

      {error && (
        <p className="mt-4 text-[0.8rem]" style={{ color: "var(--color-danger)" }}>
          {error}
        </p>
      )}

      {!stats ? (
        <p className="mt-6 text-[0.85rem]" style={{ color: "var(--color-text-tertiary)" }}>
          Loading...
        </p>
      ) : (
        <div className="mt-6 space-y-6">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            <StatCard label="Total Sellers" value={stats.totalSellers} />
            <StatCard label="Total Shipments" value={stats.totalShipments} />
            <StatCard label="In Transit" value={stats.inTransit} accent="var(--color-accent)" />
            <StatCard label="Delivered" value={stats.delivered} accent="var(--color-success)" />
            <StatCard label="Open NDR" value={stats.ndrOpen} accent="var(--color-warning)" />
          </div>

          <div className="card p-5">
            <h2 className="text-[0.8rem] font-semibold uppercase tracking-wide" style={muted}>
              Shipment volume (last 14 days)
            </h2>
            {stats.volumeTrend.length === 0 ? (
              <p className="mt-4 text-[0.85rem]" style={muted}>
                No shipments yet.
              </p>
            ) : (
              <div className="mt-4 flex items-end gap-2" style={{ height: "120px" }}>
                {stats.volumeTrend.map((v) => (
                  <div key={v.date} className="flex flex-1 flex-col items-center gap-1">
                    <div
                      className="w-full rounded-t-[4px] transition-all duration-300"
                      style={{
                        height: `${(v.count / maxVolume) * 100}%`,
                        minHeight: "2px",
                        backgroundColor: "var(--color-accent)",
                      }}
                    />
                    <span className="text-[0.65rem]" style={{ color: "var(--color-text-tertiary)" }}>
                      {v.date.slice(5)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
