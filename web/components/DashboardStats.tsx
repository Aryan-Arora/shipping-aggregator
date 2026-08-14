"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiGet } from "@/lib/api";
import { StatusBadge } from "@/components/StatusBadge";

interface DashboardStatsData {
  totalShipments: number;
  inTransit: number;
  delivered: number;
  ndrOpen: number;
  codPendingAmount: number;
  courierVolume: { courierName: string; count: number }[];
  recentShipments: {
    id: string;
    awb: string;
    status: string;
    orderRef: string;
    courierName: string;
    lastStatusAt: string;
  }[];
}

const primary = { color: "var(--color-text-primary)" };
const muted = { color: "var(--color-text-secondary)" };

function StatCard({ label, value, accent }: { label: string; value: string | number; accent?: string }) {
  return (
    <div className="card p-5">
      <p className="text-[0.75rem] font-medium uppercase tracking-wide" style={muted}>
        {label}
      </p>
      <p
        className="mt-2 text-3xl font-semibold tracking-tight"
        style={{ color: accent ?? "var(--color-text-primary)" }}
      >
        {value}
      </p>
    </div>
  );
}

export function DashboardStats() {
  const [stats, setStats] = useState<DashboardStatsData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await apiGet<DashboardStatsData>("/dashboard/stats");
        setStats(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load dashboard stats");
      }
    })();
  }, []);

  if (error) {
    return (
      <p className="mt-6 text-[0.85rem]" style={{ color: "var(--color-danger)" }}>
        {error}
      </p>
    );
  }

  if (!stats) {
    return (
      <p className="mt-6 text-[0.85rem]" style={{ color: "var(--color-text-tertiary)" }}>
        Loading dashboard...
      </p>
    );
  }

  const maxVolume = Math.max(1, ...stats.courierVolume.map((c) => c.count));

  return (
    <div className="animate-in mt-6 space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label="Total Shipments" value={stats.totalShipments} />
        <StatCard label="In Transit" value={stats.inTransit} accent="var(--color-accent)" />
        <StatCard label="Delivered" value={stats.delivered} accent="var(--color-success)" />
        <StatCard label="NDR" value={stats.ndrOpen} accent="var(--color-warning)" />
        <StatCard
          label="COD Pending"
          value={`₹${stats.codPendingAmount.toFixed(0)}`}
          accent="var(--color-danger)"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="text-[0.8rem] font-semibold uppercase tracking-wide" style={muted}>
            Courier-wise volume
          </h2>
          {stats.courierVolume.length === 0 ? (
            <p className="mt-4 text-[0.85rem]" style={muted}>
              No shipments yet.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {stats.courierVolume.map((c) => (
                <div key={c.courierName}>
                  <div className="mb-1 flex items-center justify-between text-[0.8rem]" style={primary}>
                    <span>{c.courierName}</span>
                    <span style={muted}>{c.count}</span>
                  </div>
                  <div className="h-2 w-full rounded-full" style={{ backgroundColor: "var(--color-bg)" }}>
                    <div
                      className="h-2 rounded-full"
                      style={{
                        width: `${(c.count / maxVolume) * 100}%`,
                        backgroundColor: "var(--color-accent)",
                        transition: "width var(--duration-slow) var(--ease-spring)",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card p-5">
          <h2 className="text-[0.8rem] font-semibold uppercase tracking-wide" style={muted}>
            Recent shipments
          </h2>
          {stats.recentShipments.length === 0 ? (
            <p className="mt-4 text-[0.85rem]" style={muted}>
              No shipments yet.
            </p>
          ) : (
            <div className="mt-3 space-y-2">
              {stats.recentShipments.map((s) => (
                <Link
                  key={s.id}
                  href={`/shipments/${s.id}`}
                  className="flex items-center justify-between rounded-[var(--radius-sm)] px-2 py-2 text-[0.8rem] hover:bg-[var(--color-bg)]"
                  style={{ transition: "background-color var(--duration-fast) var(--ease-spring)" }}
                >
                  <div>
                    <p style={primary}>{s.orderRef}</p>
                    <p style={muted}>{s.courierName}</p>
                  </div>
                  <StatusBadge status={s.status} />
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
