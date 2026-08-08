"use client";

import { useEffect, useMemo, useState } from "react";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";
import { Pagination } from "@/components/Pagination";

const PAGE_SIZE = 10;

interface PickupLocation {
  id: string;
  label: string;
  address_line1: string;
  address_line2: string | null;
  city: string;
  state: string;
  pincode: string;
  is_default: boolean;
}

const emptyForm = {
  label: "",
  address_line1: "",
  address_line2: "",
  city: "",
  state: "",
  pincode: "",
  is_default: false,
};

export default function PickupLocationsPage() {
  const [locations, setLocations] = useState<PickupLocation[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  async function load() {
    setLoading(true);
    try {
      const data = await apiGet<PickupLocation[]>("/pickup-locations");
      setLocations(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load pickup locations");
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
      await apiPost("/pickup-locations", form);
      setForm(emptyForm);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add pickup location");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleMarkDefault(id: string) {
    await apiPatch(`/pickup-locations/${id}`, { is_default: true });
    await load();
  }

  async function handleDelete(id: string) {
    await apiDelete(`/pickup-locations/${id}`);
    await load();
  }

  const muted = { color: "var(--color-text-secondary)" };
  const primary = { color: "var(--color-text-primary)" };

  const filtered = useMemo(() => {
    return locations.filter(
      (loc) =>
        !search ||
        loc.label.toLowerCase().includes(search.toLowerCase()) ||
        loc.city.toLowerCase().includes(search.toLowerCase()) ||
        loc.pincode.includes(search)
    );
  }, [locations, search]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [search]);

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight" style={primary}>
        Pickup Locations
      </h1>

      <form onSubmit={handleSubmit} className="card mt-6 grid max-w-2xl grid-cols-2 gap-3 p-5">
        <input
          placeholder="Label"
          required
          value={form.label}
          onChange={(e) => setForm({ ...form, label: e.target.value })}
          className="field col-span-2"
        />
        <input
          placeholder="Address line 1"
          required
          value={form.address_line1}
          onChange={(e) => setForm({ ...form, address_line1: e.target.value })}
          className="field col-span-2"
        />
        <input
          placeholder="Address line 2 (optional)"
          value={form.address_line2}
          onChange={(e) => setForm({ ...form, address_line2: e.target.value })}
          className="field col-span-2"
        />
        <input
          placeholder="City"
          required
          value={form.city}
          onChange={(e) => setForm({ ...form, city: e.target.value })}
          className="field"
        />
        <input
          placeholder="State"
          required
          value={form.state}
          onChange={(e) => setForm({ ...form, state: e.target.value })}
          className="field"
        />
        <input
          placeholder="Pincode"
          required
          value={form.pincode}
          onChange={(e) => setForm({ ...form, pincode: e.target.value })}
          className="field"
        />
        <label className="flex items-center gap-2 text-[0.85rem]" style={muted}>
          <input
            type="checkbox"
            checked={form.is_default}
            onChange={(e) => setForm({ ...form, is_default: e.target.checked })}
          />
          Set as default
        </label>
        {error && (
          <p className="col-span-2 text-[0.8rem]" style={{ color: "var(--color-danger)" }}>
            {error}
          </p>
        )}
        <button type="submit" disabled={submitting} className="btn-primary col-span-2">
          {submitting ? "Adding..." : "Add pickup location"}
        </button>
      </form>

      <div className="mt-5">
        <input
          placeholder="Search by label, city, or pincode"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="field w-64"
        />
      </div>

      <div className="table-shell mt-4">
        <table>
          <thead>
            <tr>
              <th>Label</th>
              <th>Address</th>
              <th>Pincode</th>
              <th>Default</th>
              <th></th>
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
                  {locations.length === 0 ? "No pickup locations yet." : "No pickup locations match this search."}
                </td>
              </tr>
            ) : (
              paged.map((loc) => (
                <tr key={loc.id}>
                  <td className="font-medium" style={primary}>
                    {loc.label}
                  </td>
                  <td style={muted}>
                    {loc.address_line1}, {loc.city}, {loc.state}
                  </td>
                  <td style={muted}>{loc.pincode}</td>
                  <td>
                    {loc.is_default ? (
                      <span className="text-[0.75rem] font-medium" style={{ color: "var(--color-success)" }}>
                        Default
                      </span>
                    ) : (
                      <button
                        onClick={() => handleMarkDefault(loc.id)}
                        className="text-[0.75rem] font-medium hover:underline"
                        style={{ color: "var(--color-accent)" }}
                      >
                        Mark default
                      </button>
                    )}
                  </td>
                  <td className="text-right">
                    <button
                      onClick={() => handleDelete(loc.id)}
                      className="text-[0.75rem] font-medium hover:underline"
                      style={{ color: "var(--color-danger)" }}
                    >
                      Delete
                    </button>
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
