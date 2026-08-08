import { supabase } from "../config/supabase";

const VARIANCE_THRESHOLD = 1; // rupees — ignore rounding noise

export interface CodReconciliationRow {
  courierId: string;
  courierName: string;
  expectedAmount: number;
  remittedAmount: number;
  variance: number;
  flagged: boolean;
  remittedAt: string | null;
}

// `cod_remittances` is a platform-wide table (per courier, not per seller) per the
// original schema — a seller's variance is computed from their own COD shipments,
// while the remitted side reflects whatever the courier has reported platform-wide.
export async function getCodReconciliation(sellerId: string): Promise<CodReconciliationRow[]> {
  const { data: couriers, error: courierError } = await supabase
    .from("couriers")
    .select("id, name")
    .eq("is_active", true);
  if (courierError) throw courierError;

  const { data: shipments, error: shipmentError } = await supabase
    .from("shipments")
    .select("courier_id, status, orders!inner(seller_id, payment_mode, cod_amount)")
    .eq("orders.seller_id", sellerId)
    .eq("orders.payment_mode", "cod");
  if (shipmentError) throw shipmentError;

  const expectedByCourier = new Map<string, number>();
  for (const s of shipments ?? []) {
    const order = Array.isArray(s.orders) ? s.orders[0] : s.orders;
    const amount = order?.cod_amount ?? 0;
    expectedByCourier.set(s.courier_id, (expectedByCourier.get(s.courier_id) ?? 0) + amount);
  }

  const courierIds = (couriers ?? []).map((c) => c.id);
  const { data: remittances, error: remittanceError } = await supabase
    .from("cod_remittances")
    .select("courier_id, expected_amount, remitted_amount, remitted_at, period_end")
    .in("courier_id", courierIds)
    .order("period_end", { ascending: false });
  if (remittanceError) throw remittanceError;

  const latestRemittanceByCourier = new Map<string, (typeof remittances)[number]>();
  for (const r of remittances ?? []) {
    if (!latestRemittanceByCourier.has(r.courier_id)) {
      latestRemittanceByCourier.set(r.courier_id, r);
    }
  }

  return (couriers ?? [])
    .filter((c) => (expectedByCourier.get(c.id) ?? 0) > 0)
    .map((c) => {
      const expectedAmount = expectedByCourier.get(c.id) ?? 0;
      const remittance = latestRemittanceByCourier.get(c.id);
      const remittedAmount = remittance?.remitted_amount ?? 0;
      const variance = expectedAmount - remittedAmount;
      return {
        courierId: c.id,
        courierName: c.name,
        expectedAmount,
        remittedAmount,
        variance,
        flagged: Math.abs(variance) > VARIANCE_THRESHOLD,
        remittedAt: remittance?.remitted_at ?? null,
      };
    });
}
