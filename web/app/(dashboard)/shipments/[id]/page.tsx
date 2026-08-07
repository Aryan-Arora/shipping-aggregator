"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { apiGet } from "@/lib/api";
import { StatusBadge } from "@/components/StatusBadge";

interface ShipmentEvent {
  id: string;
  status: string;
  occurred_at: string;
  raw_payload: Record<string, unknown>;
}

interface ShipmentDetail {
  id: string;
  awb: string;
  status: string;
  price: number | null;
  orders: { order_ref: string; customer_name: string };
  couriers: { name: string; code: string };
  events: ShipmentEvent[];
}

export default function ShipmentDetailPage() {
  const params = useParams<{ id: string }>();
  const [shipment, setShipment] = useState<ShipmentDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const data = await apiGet<ShipmentDetail>(`/shipments/${params.id}`);
      setShipment(data);
      setLoading(false);
    })();
  }, [params.id]);

  if (loading) return <p style={{ color: "var(--color-text-tertiary)" }}>Loading...</p>;
  if (!shipment)
    return <p style={{ color: "var(--color-danger)" }}>Shipment not found.</p>;

  return (
    <div>
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight" style={{ color: "var(--color-text-primary)" }}>
          {shipment.awb}
        </h1>
        <StatusBadge status={shipment.status} />
      </div>
      <p className="mt-1 text-[0.9rem]" style={{ color: "var(--color-text-secondary)" }}>
        {shipment.orders?.order_ref} — {shipment.orders?.customer_name} via{" "}
        {shipment.couriers?.name}
        {shipment.price ? ` — ₹${shipment.price}` : ""}
      </p>

      <h2
        className="mt-8 text-[0.75rem] font-semibold uppercase tracking-wide"
        style={{ color: "var(--color-text-tertiary)" }}
      >
        Timeline
      </h2>
      <ol className="mt-3 space-y-4 border-l pl-4" style={{ borderColor: "var(--color-border)" }}>
        {shipment.events.map((event) => (
          <li key={event.id} className="relative">
            <span
              className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: "var(--color-accent)" }}
            />
            <div className="flex items-center gap-2">
              <StatusBadge status={event.status} />
              <span className="text-[0.75rem]" style={{ color: "var(--color-text-tertiary)" }}>
                {new Date(event.occurred_at).toLocaleString()}
              </span>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
