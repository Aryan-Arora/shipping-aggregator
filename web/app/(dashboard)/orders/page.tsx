"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiGet, apiPost } from "@/lib/api";
import { StatusBadge } from "@/components/StatusBadge";
import { Pagination } from "@/components/Pagination";

const PAGE_SIZE = 10;

interface Order {
  id: string;
  order_ref: string;
  customer_name: string;
  destination_pincode: string;
  weight_kg: number;
  payment_mode: "prepaid" | "cod";
  cod_amount: number | null;
  status: string;
}

const emptyForm = {
  order_ref: "",
  customer_name: "",
  customer_phone: "",
  destination_address: "",
  destination_pincode: "",
  weight_kg: "",
  payment_mode: "prepaid" as "prepaid" | "cod",
  cod_amount: "",
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);

  const muted = { color: "var(--color-text-secondary)" };
  const primary = { color: "var(--color-text-primary)" };

  async function load() {
    setLoading(true);
    try {
      const data = await apiGet<Order[]>("/orders");
      setOrders(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load orders");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await apiPost("/orders", {
        ...form,
        weight_kg: Number(form.weight_kg),
        cod_amount: form.payment_mode === "cod" ? Number(form.cod_amount) : null,
      });
      setForm(emptyForm);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add order");
    } finally {
      setSubmitting(false);
    }
  }

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      const matchesSearch =
        !search ||
        o.order_ref.toLowerCase().includes(search.toLowerCase()) ||
        o.customer_name.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "all" || o.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [orders, search, statusFilter]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight" style={primary}>
        Orders
      </h1>

      <form onSubmit={handleSubmit} className="card mt-6 grid max-w-2xl grid-cols-2 gap-3 p-5">
        <input
          placeholder="Order ref"
          required
          value={form.order_ref}
          onChange={(e) => setForm({ ...form, order_ref: e.target.value })}
          className="field"
        />
        <input
          placeholder="Customer name"
          required
          value={form.customer_name}
          onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
          className="field"
        />
        <input
          placeholder="Customer phone"
          value={form.customer_phone}
          onChange={(e) => setForm({ ...form, customer_phone: e.target.value })}
          className="field"
        />
        <input
          placeholder="Destination pincode"
          required
          value={form.destination_pincode}
          onChange={(e) => setForm({ ...form, destination_pincode: e.target.value })}
          className="field"
        />
        <input
          placeholder="Destination address"
          required
          value={form.destination_address}
          onChange={(e) => setForm({ ...form, destination_address: e.target.value })}
          className="field col-span-2"
        />
        <input
          placeholder="Weight (kg)"
          type="number"
          step="0.1"
          required
          value={form.weight_kg}
          onChange={(e) => setForm({ ...form, weight_kg: e.target.value })}
          className="field"
        />
        <select
          value={form.payment_mode}
          onChange={(e) =>
            setForm({ ...form, payment_mode: e.target.value as "prepaid" | "cod" })
          }
          className="field"
        >
          <option value="prepaid">Prepaid</option>
          <option value="cod">COD</option>
        </select>
        {form.payment_mode === "cod" && (
          <input
            placeholder="COD amount"
            type="number"
            step="0.01"
            required
            value={form.cod_amount}
            onChange={(e) => setForm({ ...form, cod_amount: e.target.value })}
            className="field col-span-2"
          />
        )}
        {error && (
          <p className="col-span-2 text-[0.8rem]" style={{ color: "var(--color-danger)" }}>
            {error}
          </p>
        )}
        <button type="submit" disabled={submitting} className="btn-primary col-span-2">
          {submitting ? "Adding..." : "Add order"}
        </button>
      </form>

      <div className="mt-5 flex gap-3">
        <input
          placeholder="Search by order ref or customer"
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
          <option value="pending">Pending</option>
          <option value="shipped">Shipped</option>
        </select>
      </div>

      <div className="table-shell mt-4">
        <table>
          <thead>
            <tr>
              <th>Order Ref</th>
              <th>Customer</th>
              <th>Pincode</th>
              <th>Weight</th>
              <th>Payment</th>
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
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} style={muted}>
                  {orders.length === 0 ? "No orders yet." : "No orders match these filters."}
                </td>
              </tr>
            ) : (
              paged.map((order) => (
                <tr key={order.id}>
                  <td className="font-medium" style={primary}>
                    {order.order_ref}
                  </td>
                  <td style={muted}>{order.customer_name}</td>
                  <td style={muted}>{order.destination_pincode}</td>
                  <td style={muted}>{order.weight_kg} kg</td>
                  <td style={muted}>
                    {order.payment_mode === "cod" ? `COD ₹${order.cod_amount}` : "Prepaid"}
                  </td>
                  <td>
                    <StatusBadge status={order.status} />
                  </td>
                  <td className="text-right">
                    {order.status === "pending" && (
                      <Link
                        href={`/ship-now?orderId=${order.id}`}
                        className="text-[0.75rem] font-medium hover:underline"
                        style={{ color: "var(--color-accent)" }}
                      >
                        Ship now
                      </Link>
                    )}
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
