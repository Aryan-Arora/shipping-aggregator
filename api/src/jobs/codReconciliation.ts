import { currentMonthPeriod, generateExpectedForAllActiveCouriers } from "../services/codRemittanceService";

// Nightly-style job: recompute this month's expected COD amount per active
// courier from actual shipments booked. The remitted side is entered by an
// admin (see POST /admin/cod/remittances/:id) as couriers actually pay out —
// this job only keeps the "what we're owed" side current.
export async function runCodReconciliation() {
  const { periodStart, periodEnd } = currentMonthPeriod();
  const results = await generateExpectedForAllActiveCouriers(periodStart, periodEnd);
  return { periodStart, periodEnd, couriersUpdated: results.length };
}
