"use client";

import { Fragment, useEffect, useState } from "react";
import { apiGet, apiPatch } from "@/lib/api";

interface Courier {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
  isMock: boolean;
  totalShipments: number;
  deliverySuccessRate: number | null;
  ndrRate: number | null;
}

interface RateCardQuote {
  courierName: string;
  pincode: string;
  weightKg: number;
  price: number;
  eta: string;
  serviceable: boolean;
}

const muted = { color: "var(--color-text-secondary)" };
const primary = { color: "var(--color-text-primary)" };

export default function AdminCouriersPage() {
  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);

  const [testingId, setTestingId] = useState<string | null>(null);
  const [pincode, setPincode] = useState("");
  const [weight, setWeight] = useState("1");
  const [quote, setQuote] = useState<RateCardQuote | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      setCouriers(await apiGet<Courier[]>("/admin/couriers"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load couriers");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function toggleActive(courier: Courier) {
    setActingId(courier.id);
    try {
      await apiPatch(`/admin/couriers/${courier.id}`, { is_active: !courier.isActive });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setActingId(null);
    }
  }

  function startTest(courierId: string) {
    setTestingId(courierId);
    setQuote(null);
    setQuoteError(null);
  }

  async function runTest(courierId: string) {
    setQuoteLoading(true);
    setQuoteError(null);
    setQuote(null);
    try {
      setQuote(
        await apiGet<RateCardQuote>(
          `/admin/couriers/${courierId}/rate-card?pincode=${encodeURIComponent(pincode)}&weight=${encodeURIComponent(weight)}`
        )
      );
    } catch (err) {
      setQuoteError(err instanceof Error ? err.message : "Rate check failed");
    } finally {
      setQuoteLoading(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight" style={primary}>
        Couriers
      </h1>
      <p className="mt-1 text-[0.85rem]" style={muted}>
        Enable or disable couriers platform-wide, track performance, and test live rate quotes.
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
              <th>Courier</th>
              <th>Code</th>
              <th>Shipments</th>
              <th>Delivery success</th>
              <th>NDR rate</th>
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
            ) : (
              couriers.map((c) => (
                <Fragment key={c.id}>
                  <tr>
                    <td className="font-medium" style={primary}>
                      {c.name}
                      {c.isMock && (
                        <span className="ml-2 text-[0.7rem]" style={{ color: "var(--color-text-tertiary)" }}>
                          mock
                        </span>
                      )}
                    </td>
                    <td className="font-mono text-[0.75rem]" style={muted}>
                      {c.code}
                    </td>
                    <td style={muted}>{c.totalShipments}</td>
                    <td style={muted}>{c.deliverySuccessRate !== null ? `${c.deliverySuccessRate}%` : "—"}</td>
                    <td style={{ color: (c.ndrRate ?? 0) > 20 ? "var(--color-warning)" : "var(--color-text-secondary)" }}>
                      {c.ndrRate !== null ? `${c.ndrRate}%` : "—"}
                    </td>
                    <td>
                      <span
                        className="badge"
                        style={
                          c.isActive
                            ? { backgroundColor: "var(--color-success-soft)", color: "var(--color-success)" }
                            : { backgroundColor: "var(--color-danger-soft)", color: "var(--color-danger)" }
                        }
                      >
                        {c.isActive ? "Active" : "Disabled"}
                      </span>
                    </td>
                    <td className="text-right">
                      <div className="flex justify-end gap-3">
                        <button
                          onClick={() => (testingId === c.id ? setTestingId(null) : startTest(c.id))}
                          className="text-[0.75rem] font-medium hover:underline"
                          style={{ color: "var(--color-accent)" }}
                        >
                          {testingId === c.id ? "Close" : "Test rate"}
                        </button>
                        <button
                          disabled={actingId === c.id}
                          onClick={() => toggleActive(c)}
                          className="text-[0.75rem] font-medium hover:underline disabled:opacity-50"
                          style={{ color: c.isActive ? "var(--color-danger)" : "var(--color-accent)" }}
                        >
                          {c.isActive ? "Disable" : "Enable"}
                        </button>
                      </div>
                    </td>
                  </tr>
                  {testingId === c.id && (
                    <tr>
                      <td colSpan={7}>
                        <div className="flex flex-wrap items-end gap-3 py-2">
                          <div>
                            <label className="label">Pincode</label>
                            <input
                              value={pincode}
                              onChange={(e) => setPincode(e.target.value)}
                              placeholder="110001"
                              className="field w-32"
                            />
                          </div>
                          <div>
                            <label className="label">Weight (kg)</label>
                            <input
                              value={weight}
                              onChange={(e) => setWeight(e.target.value)}
                              type="number"
                              step="0.1"
                              className="field w-24"
                            />
                          </div>
                          <button
                            onClick={() => runTest(c.id)}
                            disabled={quoteLoading || !pincode}
                            className="btn-secondary"
                          >
                            {quoteLoading ? "Checking..." : "Get quote"}
                          </button>
                          {quoteError && (
                            <span className="text-[0.8rem]" style={{ color: "var(--color-danger)" }}>
                              {quoteError}
                            </span>
                          )}
                          {quote && (
                            <span className="text-[0.85rem]" style={primary}>
                              {quote.serviceable
                                ? `₹${quote.price} — ETA ${quote.eta}`
                                : "Not serviceable for this pincode"}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
