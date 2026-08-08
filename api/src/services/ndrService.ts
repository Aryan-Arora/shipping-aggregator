import { supabase } from "../config/supabase";

const SELECT_NDR = `
  id, reason, attempts, status, escalated, created_at,
  shipments!inner(
    id, awb, status,
    couriers(name, code),
    orders!inner(seller_id, order_ref, customer_name, sellers(company_name))
  )
`;

function normalizeNdrRow(row: any) {
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
    shipmentId: shipment?.id,
    courierName: courier?.name,
    orderRef: order?.order_ref,
    customerName: order?.customer_name,
    sellerName: seller?.company_name,
  };
}

export async function listNdrCases(sellerId: string) {
  const { data, error } = await supabase
    .from("ndr_cases")
    .select(SELECT_NDR)
    .eq("shipments.orders.seller_id", sellerId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map(normalizeNdrRow);
}

async function assertOwnedByCaller(id: string, sellerId: string) {
  const { data, error } = await supabase
    .from("ndr_cases")
    .select("id, shipments!inner(orders!inner(seller_id))")
    .eq("id", id)
    .eq("shipments.orders.seller_id", sellerId)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("NDR case not found");
}

async function reattempt(id: string) {
  const { data: current } = await supabase.from("ndr_cases").select("attempts").eq("id", id).single();

  const { data, error } = await supabase
    .from("ndr_cases")
    .update({ status: "reattempt_scheduled", attempts: (current?.attempts ?? 1) + 1 })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function cancel(id: string) {
  const { data, error } = await supabase
    .from("ndr_cases")
    .update({ status: "rto" })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function resolve(id: string) {
  const { data, error } = await supabase
    .from("ndr_cases")
    .update({ status: "resolved" })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function escalate(id: string) {
  const { data, error } = await supabase
    .from("ndr_cases")
    .update({ escalated: true })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Seller-scoped — verifies the case belongs to the seller before touching it.
export async function reattemptNdrCase(id: string, sellerId: string) {
  await assertOwnedByCaller(id, sellerId);
  return reattempt(id);
}
export async function cancelNdrCase(id: string, sellerId: string) {
  await assertOwnedByCaller(id, sellerId);
  return cancel(id);
}
export async function resolveNdrCase(id: string, sellerId: string) {
  await assertOwnedByCaller(id, sellerId);
  return resolve(id);
}
export async function escalateNdrCase(id: string, sellerId: string) {
  await assertOwnedByCaller(id, sellerId);
  return escalate(id);
}

// Admin — no ownership check, since requireAdmin already gates the whole
// /admin router and an admin is allowed to act on any seller's case.
export const adminReattemptNdrCase = reattempt;
export const adminCancelNdrCase = cancel;
export const adminResolveNdrCase = resolve;
export const adminEscalateNdrCase = escalate;
