import { supabase } from "../config/supabase";

export function currentMonthPeriod() {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0));
  return { periodStart: start.toISOString().slice(0, 10), periodEnd: end.toISOString().slice(0, 10) };
}

// Sums COD amounts across every seller's shipments for one courier in a
// period, then upserts the `expected_amount` side of that period's
// remittance row — leaving `remitted_amount` untouched if the row already
// exists (that side is only ever set by recordRemittance, below).
export async function generateExpectedForCourier(courierId: string, periodStart: string, periodEnd: string) {
  const { data: shipments, error } = await supabase
    .from("shipments")
    .select("orders!inner(payment_mode, cod_amount)")
    .eq("courier_id", courierId)
    .gte("booked_at", periodStart)
    .lte("booked_at", `${periodEnd}T23:59:59`)
    .eq("orders.payment_mode", "cod");

  if (error) throw error;

  const expectedAmount = (shipments ?? []).reduce((sum, s) => {
    const order = Array.isArray(s.orders) ? s.orders[0] : s.orders;
    return sum + (order?.cod_amount ?? 0);
  }, 0);

  const { data, error: upsertError } = await supabase
    .from("cod_remittances")
    .upsert(
      { courier_id: courierId, period_start: periodStart, period_end: periodEnd, expected_amount: expectedAmount },
      { onConflict: "courier_id,period_start,period_end" }
    )
    .select()
    .single();

  if (upsertError) throw upsertError;
  return data;
}

export async function generateExpectedForAllActiveCouriers(periodStart: string, periodEnd: string) {
  const { data: couriers, error } = await supabase.from("couriers").select("id").eq("is_active", true);
  if (error) throw error;

  const results = [];
  for (const courier of couriers ?? []) {
    results.push(await generateExpectedForCourier(courier.id, periodStart, periodEnd));
  }
  return results;
}

export async function recordRemittance(id: string, remittedAmount: number, remittedAt?: string) {
  const { data, error } = await supabase
    .from("cod_remittances")
    .update({ remitted_amount: remittedAmount, remitted_at: remittedAt ?? new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}
