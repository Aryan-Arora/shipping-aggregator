import { supabase } from "../config/supabase";
import { adapterRegistry } from "../adapters";

export class SelfDeactivationError extends Error {
  constructor() {
    super("You cannot deactivate your own account");
    this.name = "SelfDeactivationError";
  }
}

// Pulled out of the route handler so it's unit-testable without standing up
// an Express app — this is the guard against the lockout bug caught live
// during Tier 10 (an admin deactivating the only account, including their
// own, locks everyone out until someone fixes it via direct DB access).
export function assertNotSelfDeactivation(
  targetSellerId: string,
  callerSellerId: string,
  updates: { is_active?: boolean }
) {
  if (targetSellerId === callerSellerId && updates.is_active === false) {
    throw new SelfDeactivationError();
  }
}

export async function listSellers() {
  const { data, error } = await supabase
    .from("sellers")
    .select("id, company_name, email, phone, role, is_active, created_at")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function updateSeller(
  id: string,
  updates: { company_name?: string; phone?: string; is_active?: boolean }
) {
  const { data, error } = await supabase
    .from("sellers")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export interface ShipmentFilters {
  sellerId?: string;
  courierId?: string;
  status?: string;
  from?: string;
  to?: string;
}

export async function listShipmentsAdmin(filters: ShipmentFilters) {
  let query = supabase
    .from("shipments")
    .select(
      "id, awb, status, price, booked_at, last_status_at, courier_id, orders!inner(order_ref, customer_name, seller_id, sellers(company_name)), couriers(name, code)"
    )
    .order("booked_at", { ascending: false })
    .limit(200);

  if (filters.sellerId) query = query.eq("orders.seller_id", filters.sellerId);
  if (filters.courierId) query = query.eq("courier_id", filters.courierId);
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.from) query = query.gte("booked_at", filters.from);
  if (filters.to) query = query.lte("booked_at", filters.to);

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? []).map((s) => {
    const order = Array.isArray(s.orders) ? s.orders[0] : s.orders;
    const seller = Array.isArray(order?.sellers) ? order.sellers[0] : order?.sellers;
    const courier = Array.isArray(s.couriers) ? s.couriers[0] : s.couriers;
    return {
      id: s.id,
      awb: s.awb,
      status: s.status,
      price: s.price,
      bookedAt: s.booked_at,
      lastStatusAt: s.last_status_at,
      orderRef: order?.order_ref,
      customerName: order?.customer_name,
      sellerName: seller?.company_name,
      courierName: courier?.name,
    };
  });
}

export async function listCouriersWithPerformance() {
  const { data: couriers, error: courierError } = await supabase
    .from("couriers")
    .select("id, name, code, is_active, is_mock")
    .order("name");
  if (courierError) throw courierError;

  const { data: shipments, error: shipmentError } = await supabase
    .from("shipments")
    .select("courier_id, status");
  if (shipmentError) throw shipmentError;

  const { data: ndrCases, error: ndrError } = await supabase
    .from("ndr_cases")
    .select("shipment_id, shipments(courier_id)");
  if (ndrError) throw ndrError;

  const ndrByCourier = new Map<string, number>();
  for (const c of ndrCases ?? []) {
    const shipment = Array.isArray(c.shipments) ? c.shipments[0] : c.shipments;
    const courierId = shipment?.courier_id;
    if (!courierId) continue;
    ndrByCourier.set(courierId, (ndrByCourier.get(courierId) ?? 0) + 1);
  }

  return (couriers ?? []).map((c) => {
    const courierShipments = (shipments ?? []).filter((s) => s.courier_id === c.id);
    const total = courierShipments.length;
    const delivered = courierShipments.filter((s) => s.status === "delivered").length;
    const ndrCount = ndrByCourier.get(c.id) ?? 0;
    return {
      id: c.id,
      name: c.name,
      code: c.code,
      isActive: c.is_active,
      isMock: c.is_mock,
      totalShipments: total,
      deliverySuccessRate: total > 0 ? Math.round((delivered / total) * 1000) / 10 : null,
      ndrRate: total > 0 ? Math.round((ndrCount / total) * 1000) / 10 : null,
    };
  });
}

// "View rate cards" from the original spec's courier-management item — since
// pricing is computed dynamically per adapter (no static rate-card table),
// this runs a live test quote through the courier's actual adapter rather
// than inventing a separate pricing table to display.
export async function getCourierRateCard(courierId: string, pincode: string, weightKg: number) {
  const { data: courier, error } = await supabase
    .from("couriers")
    .select("id, name, code")
    .eq("id", courierId)
    .single();
  if (error || !courier) throw new Error("Courier not found");

  const adapter = adapterRegistry[courier.code];
  if (!adapter) {
    throw new Error(`No adapter registered for courier code ${courier.code} — nothing to test`);
  }

  const quote = await adapter.getRates(pincode, weightKg);
  return { courierName: courier.name, pincode, weightKg, ...quote };
}

export async function updateCourier(id: string, updates: { is_active?: boolean }) {
  const { data, error } = await supabase
    .from("couriers")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function listNdrCasesAdmin() {
  const { data, error } = await supabase
    .from("ndr_cases")
    .select(
      "id, reason, attempts, status, escalated, created_at, shipments(awb, couriers(name), orders(order_ref, customer_name, sellers(company_name)))"
    )
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;

  return (data ?? []).map((row) => {
    const shipment = Array.isArray(row.shipments) ? row.shipments[0] : row.shipments;
    const courier = Array.isArray(shipment?.couriers) ? shipment.couriers[0] : shipment?.couriers;
    const order = Array.isArray(shipment?.orders) ? shipment.orders[0] : shipment?.orders;
    const seller = Array.isArray(order?.sellers) ? order.sellers[0] : order?.sellers;
    return {
      id: row.id,
      reason: row.reason,
      attempts: row.attempts,
      status: row.status,
      escalated: row.escalated,
      createdAt: row.created_at,
      awb: shipment?.awb,
      courierName: courier?.name,
      orderRef: order?.order_ref,
      sellerName: seller?.company_name,
    };
  });
}

export async function listCodRemittancesAdmin() {
  const { data, error } = await supabase
    .from("cod_remittances")
    .select("id, courier_id, period_start, period_end, expected_amount, remitted_amount, remitted_at, couriers(name)")
    .order("period_end", { ascending: false });
  if (error) throw error;

  return (data ?? []).map((r) => {
    const courier = Array.isArray(r.couriers) ? r.couriers[0] : r.couriers;
    const variance = r.expected_amount - r.remitted_amount;
    return {
      id: r.id,
      courierName: courier?.name,
      periodStart: r.period_start,
      periodEnd: r.period_end,
      expectedAmount: r.expected_amount,
      remittedAmount: r.remitted_amount,
      variance,
      flagged: Math.abs(variance) > 1,
      remittedAt: r.remitted_at,
    };
  });
}

export async function getPlatformStats() {
  const { count: totalSellers } = await supabase
    .from("sellers")
    .select("id", { count: "exact", head: true });

  const { count: totalShipments } = await supabase
    .from("shipments")
    .select("id", { count: "exact", head: true });

  const { data: shipments } = await supabase.from("shipments").select("status, booked_at");

  const inTransit = (shipments ?? []).filter((s) =>
    ["picked_up", "in_transit"].includes(s.status)
  ).length;
  const delivered = (shipments ?? []).filter((s) => s.status === "delivered").length;

  const { count: ndrOpen } = await supabase
    .from("ndr_cases")
    .select("id", { count: "exact", head: true })
    .eq("status", "open");

  const volumeByDay = new Map<string, number>();
  for (const s of shipments ?? []) {
    const day = new Date(s.booked_at).toISOString().slice(0, 10);
    volumeByDay.set(day, (volumeByDay.get(day) ?? 0) + 1);
  }
  const volumeTrend = Array.from(volumeByDay.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-14)
    .map(([date, count]) => ({ date, count }));

  return {
    totalSellers: totalSellers ?? 0,
    totalShipments: totalShipments ?? 0,
    inTransit,
    delivered,
    ndrOpen: ndrOpen ?? 0,
    volumeTrend,
  };
}
