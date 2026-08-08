import { supabase } from "../config/supabase";

const SELECT_NDR = `
  id, reason, attempts, status, escalated, created_at,
  shipments!inner(
    id, awb, status,
    couriers(name, code),
    orders!inner(seller_id, order_ref, customer_name)
  )
`;

export async function listNdrCases(sellerId: string) {
  const { data, error } = await supabase
    .from("ndr_cases")
    .select(SELECT_NDR)
    .eq("shipments.orders.seller_id", sellerId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data ?? []).map((row) => {
    const shipment = Array.isArray(row.shipments) ? row.shipments[0] : row.shipments;
    const courier = Array.isArray(shipment?.couriers) ? shipment.couriers[0] : shipment?.couriers;
    const order = Array.isArray(shipment?.orders) ? shipment.orders[0] : shipment?.orders;
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
    };
  });
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

export async function reattemptNdrCase(id: string, sellerId: string) {
  await assertOwnedByCaller(id, sellerId);
  const { data: current } = await supabase
    .from("ndr_cases")
    .select("attempts")
    .eq("id", id)
    .single();

  const { data, error } = await supabase
    .from("ndr_cases")
    .update({ status: "reattempt_scheduled", attempts: (current?.attempts ?? 1) + 1 })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function cancelNdrCase(id: string, sellerId: string) {
  await assertOwnedByCaller(id, sellerId);
  const { data, error } = await supabase
    .from("ndr_cases")
    .update({ status: "rto" })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function resolveNdrCase(id: string, sellerId: string) {
  await assertOwnedByCaller(id, sellerId);
  const { data, error } = await supabase
    .from("ndr_cases")
    .update({ status: "resolved" })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function escalateNdrCase(id: string, sellerId: string) {
  await assertOwnedByCaller(id, sellerId);
  const { data, error } = await supabase
    .from("ndr_cases")
    .update({ escalated: true })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}
