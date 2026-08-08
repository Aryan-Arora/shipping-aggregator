"use client";

import { useEffect, useMemo, useState } from "react";
import { apiGet } from "@/lib/api";
import { StatusBadge } from "@/components/StatusBadge";
import { Pagination } from "@/components/Pagination";

const PAGE_SIZE = 15;

interface Shipment {
  id: string;
  awb: string;
  status: string;
  price: number | null;
  bookedAt: string;
  lastStatusAt: string;
  orderRef: string;
  customerName: string;
  sellerName: string;
  courierName: string;
}

interface Seller {
  id: string;
  company_name: string;
}

interface Courier {
  id: string;
  name: string;
}

const muted = { color: "var(--color-text-secondary)" };
const primary = { color: "var(--color-text-primary)" };

export default function AdminShipmentsPage() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [sellerId, setSellerId] = useState("");
  const [courierId, setCourierId] = useState("");
  const [status, setStatus] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    (async () => {
      const [sellerData, courierData] = await Promise.all([
        apiGet<Seller[]>("/admin/sellers"),
        apiGet<Courier[]>("/admin/couriers"),
      ]);
      setSellers(sellerData);
      setCouriers(courierData);
    })();
  }, []);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (sellerId) params.set("sellerId", sellerId);
    if (courierId) params.set("courierId", courierId);
    if (status) params.set("status", status);
    if (fromDate) params.set("from", fromDate);
    if (toDate) params.set("to", `${toDate}T23:59:59`);
    return params.toString();
  }, [sellerId, courierId, status, fromDate, toDate]);

  useEffect(() => {
    setLoading(true);
    apiGet<Shipment[]>(`/admin/shipments${queryString ? `?${queryString}` : ""}`)
      .then(setShipments)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load shipments"))
      .finally(() => setLoading(false));
  }, [queryString]);

  useEffect(() => {
    setPage(1);
  }, [queryString]);

  const pageCount = Math.max(1, Math.ceil(shipments.length / PAGE_SIZE));
  const paged = shipments.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight" style={primary}>
        All Shipments
      </h1>
      <p className="mt-1 text-[0.85rem]" style={muted}>
        Every shipment across every seller.
      </p>

      <div className="mt-5 flex flex-wrap items-end gap-3">
        <select value={sellerId} onChange={(e) => setSellerId(e.target.value)} className="field w-auto">
          <option value="">All sellers</option>
          {sellers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.company_name}
            </option>
          ))}
        </select>
        <select value={courierId} onChange={(e) => setCourierId(e.target.value)} className="field w-auto">
          <option value="">All couriers</option>
          {couriers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="field w-auto">
          <option value="">All statuses</option>
          <option value="booked">Booked</option>
          <option value="picked_up">Picked up</option>
          <option value="in_transit">In transit</option>
          <option value="delivered">Delivered</option>
          <option value="ndr">NDR</option>
          <option value="rto">RTO</option>
        </select>
        <div>
          <label className="label">From</label>
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="field w-auto" />
        </div>
        <div>
          <label className="label">To</label>
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="field w-auto" />
        </div>
      </div>

      {error && (
        <p className="mt-4 text-[0.8rem]" style={{ color: "var(--color-danger)" }}>
          {error}
        </p>
      )}

      <div className="table-shell mt-4">
        <table>
          <thead>
            <tr>
              <th>AWB / Order</th>
              <th>Seller</th>
              <th>Courier</th>
              <th>Status</th>
              <th>Last updated</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} style={muted}>
                  Loading...
                </td>
              </tr>
            ) : shipments.length === 0 ? (
              <tr>
                <td colSpan={5} style={muted}>
                  No shipments match these filters.
                </td>
              </tr>
            ) : (
              paged.map((s) => (
                <tr key={s.id}>
                  <td>
                    <p className="font-medium" style={primary}>
                      {s.orderRef}
                    </p>
                    <p className="font-mono text-[0.7rem]" style={muted}>
                      {s.awb}
                    </p>
                  </td>
                  <td style={muted}>{s.sellerName}</td>
                  <td style={muted}>{s.courierName}</td>
                  <td>
                    <StatusBadge status={s.status} />
                  </td>
                  <td style={{ color: "var(--color-text-tertiary)" }}>
                    {new Date(s.lastStatusAt).toLocaleString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <Pagination page={page} pageCount={pageCount} onPageChange={setPage} />
    </div>
  );
}
