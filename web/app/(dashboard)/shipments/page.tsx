"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiGet } from "@/lib/api";
import { StatusBadge } from "@/components/StatusBadge";

interface Shipment {
  id: string;
  awb: string;
  status: string;
  price: number | null;
  booked_at: string;
  last_status_at: string;
  orders: { order_ref: string; customer_name: string };
  couriers: { name: string; code: string };
}

export default function ShipmentsPage() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const muted = { color: "var(--color-text-secondary)" };
  const primary = { color: "var(--color-text-primary)" };

  useEffect(() => {
    (async () => {
      const data = await apiGet<Shipment[]>("/shipments");
      setShipments(data);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    return shipments.filter((s) => {
      const matchesSearch =
        !search ||
        s.awb?.toLowerCase().includes(search.toLowerCase()) ||
        s.orders?.order_ref?.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "all" || s.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [shipments, search, statusFilter]);

  const statuses = useMemo(() => Array.from(new Set(shipments.map((s) => s.status))), [shipments]);

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight" style={primary}>
        Shipments
      </h1>

      <div className="mt-5 flex gap-3">
        <input
          placeholder="Search by AWB or order ref"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="field w-64"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="field w-auto"
        >
          <option value="all">All statuses</option>
          {statuses.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div className="table-shell mt-4">
        <table>
          <thead>
            <tr>
              <th>AWB</th>
              <th>Order</th>
              <th>Courier</th>
              <th>Status</th>
              <th>Last Updated</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} style={muted}>
                  Loading...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={5} style={muted}>
                  No shipments yet.
                </td>
              </tr>
            ) : (
              filtered.map((s) => (
                <tr key={s.id}>
                  <td>
                    <Link
                      href={`/shipments/${s.id}`}
                      className="font-mono text-[0.75rem] font-medium hover:underline"
                      style={{ color: "var(--color-accent)" }}
                    >
                      {s.awb}
                    </Link>
                  </td>
                  <td style={muted}>{s.orders?.order_ref}</td>
                  <td style={muted}>{s.couriers?.name}</td>
                  <td>
                    <StatusBadge status={s.status} />
                  </td>
                  <td style={{ color: "var(--color-text-tertiary)" }}>
                    {new Date(s.last_status_at).toLocaleString()}
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
