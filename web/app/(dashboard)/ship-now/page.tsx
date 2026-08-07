"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { apiGet, apiPost } from "@/lib/api";
import { StatusBadge } from "@/components/StatusBadge";

interface Order {
  id: string;
  order_ref: string;
  customer_name: string;
  destination_pincode: string;
  weight_kg: number;
  status: string;
}

interface PickupLocation {
  id: string;
  label: string;
  is_default: boolean;
}

interface RateQuote {
  courierId: string;
  courierCode: string;
  courierName: string;
  price: number | null;
  eta: string | null;
  serviceable: boolean;
  error?: string;
}

function ShipNowInner() {
  const searchParams = useSearchParams();
  const preselectedOrderId = searchParams.get("orderId");

  const [orders, setOrders] = useState<Order[]>([]);
  const [pickupLocations, setPickupLocations] = useState<PickupLocation[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState(preselectedOrderId ?? "");
  const [selectedPickupId, setSelectedPickupId] = useState("");
  const [rates, setRates] = useState<RateQuote[] | null>(null);
  const [loadingRates, setLoadingRates] = useState(false);
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<{ awb: string; courierName: string } | null>(
    null
  );

  const muted = { color: "var(--color-text-secondary)" };
  const primary = { color: "var(--color-text-primary)" };

  useEffect(() => {
    (async () => {
      const [orderData, pickupData] = await Promise.all([
        apiGet<Order[]>("/orders"),
        apiGet<PickupLocation[]>("/pickup-locations"),
      ]);
      setOrders(orderData.filter((o) => o.status === "pending"));
      setPickupLocations(pickupData);
      const defaultPickup = pickupData.find((p) => p.is_default);
      if (defaultPickup) setSelectedPickupId(defaultPickup.id);
    })();
  }, []);

  const selectedOrder = orders.find((o) => o.id === selectedOrderId);

  async function handleCompareRates() {
    if (!selectedOrder) return;
    setLoadingRates(true);
    setError(null);
    setRates(null);
    try {
      const data = await apiPost<RateQuote[]>("/rates/compare", {
        pincode: selectedOrder.destination_pincode,
        weight: selectedOrder.weight_kg,
      });
      setRates(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to compare rates");
    } finally {
      setLoadingRates(false);
    }
  }

  async function handleBook(courierId: string, courierName: string) {
    if (!selectedOrder || !selectedPickupId) return;
    setBooking(true);
    setError(null);
    try {
      const shipment = await apiPost<{ awb: string }>("/shipments", {
        orderId: selectedOrder.id,
        courierId,
        pickupLocationId: selectedPickupId,
      });
      setConfirmation({ awb: shipment.awb, courierName });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Booking failed");
    } finally {
      setBooking(false);
    }
  }

  if (confirmation) {
    return (
      <div
        className="card animate-in max-w-md p-7"
        style={{ borderColor: "var(--color-success)", backgroundColor: "var(--color-success-soft)" }}
      >
        <h1 className="text-lg font-semibold tracking-tight" style={{ color: "var(--color-success)" }}>
          Shipment booked!
        </h1>
        <p className="mt-2 text-[0.9rem]" style={{ color: "var(--color-text-primary)" }}>
          Courier: <strong>{confirmation.courierName}</strong>
        </p>
        <p className="mt-1 text-[0.9rem]" style={{ color: "var(--color-text-primary)" }}>
          AWB: <strong className="font-mono">{confirmation.awb}</strong>
        </p>
        <button
          onClick={() => {
            setConfirmation(null);
            setSelectedOrderId("");
            setRates(null);
          }}
          className="btn-primary mt-4"
          style={{ backgroundColor: "var(--color-success)" }}
        >
          Book another
        </button>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight" style={primary}>
        Ship Now
      </h1>

      <div className="card animate-in mt-6 max-w-xl space-y-4 p-5">
        <div>
          <label className="label">Order</label>
          <select
            value={selectedOrderId}
            onChange={(e) => {
              setSelectedOrderId(e.target.value);
              setRates(null);
            }}
            className="field"
          >
            <option value="">Select a pending order</option>
            {orders.map((o) => (
              <option key={o.id} value={o.id}>
                {o.order_ref} — {o.customer_name} ({o.destination_pincode}, {o.weight_kg}kg)
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">Pickup location</label>
          <select
            value={selectedPickupId}
            onChange={(e) => setSelectedPickupId(e.target.value)}
            className="field"
          >
            <option value="">Select a pickup location</option>
            {pickupLocations.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label} {p.is_default ? "(default)" : ""}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={handleCompareRates}
          disabled={!selectedOrder || !selectedPickupId || loadingRates}
          className="btn-primary"
        >
          {loadingRates ? "Comparing..." : "Compare courier rates"}
        </button>
      </div>

      {error && (
        <p className="mt-4 text-[0.85rem]" style={{ color: "var(--color-danger)" }}>
          {error}
        </p>
      )}

      {rates && (
        <div className="animate-in mt-6 grid max-w-3xl grid-cols-1 gap-4 sm:grid-cols-3">
          {rates.map((rate) => (
            <div key={rate.courierId} className="card flex flex-col p-5">
              <div className="flex items-center justify-between">
                <h3 className="font-medium" style={primary}>
                  {rate.courierName}
                </h3>
                <StatusBadge status={rate.serviceable ? "delivered" : "failed"} />
              </div>
              {rate.serviceable ? (
                <>
                  <p className="mt-3 text-2xl font-semibold tracking-tight" style={primary}>
                    ₹{rate.price}
                  </p>
                  <p className="text-[0.85rem]" style={muted}>
                    ETA: {rate.eta}
                  </p>
                  <button
                    onClick={() => handleBook(rate.courierId, rate.courierName)}
                    disabled={booking}
                    className="btn-primary mt-4"
                  >
                    {booking ? "Booking..." : "Book this courier"}
                  </button>
                </>
              ) : (
                <p className="mt-3 text-[0.85rem]" style={muted}>
                  {rate.error ?? "Not serviceable for this pincode"}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ShipNowPage() {
  return (
    <Suspense fallback={<p style={{ color: "var(--color-text-tertiary)" }}>Loading...</p>}>
      <ShipNowInner />
    </Suspense>
  );
}
