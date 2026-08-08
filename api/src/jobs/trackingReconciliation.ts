import { supabase } from "../config/supabase";
import { adapterRegistry } from "../adapters";
import { applyShipmentStatusUpdate } from "../services/shipmentEventService";
import { enqueueFailedOperation } from "./retryQueue";

const TERMINAL_STATUSES = new Set(["delivered", "rto"]);

// Webhook fallback: for any shipment that hasn't heard from its courier in
// a while, poll trackShipment() directly instead of waiting indefinitely
// for a webhook that may have silently failed to arrive.
export async function reconcileStaleShipments(
  staleHours = Number(process.env.TRACKING_STALE_HOURS ?? 6)
) {
  const threshold = new Date(Date.now() - staleHours * 60 * 60 * 1000).toISOString();

  const { data: shipments, error } = await supabase
    .from("shipments")
    .select("id, awb, status, courier_id, couriers(code)")
    .lt("last_status_at", threshold);

  if (error) throw error;

  let checked = 0;
  let updated = 0;
  let failed = 0;

  for (const shipment of shipments ?? []) {
    if (TERMINAL_STATUSES.has(shipment.status)) continue;

    const courier = Array.isArray(shipment.couriers) ? shipment.couriers[0] : shipment.couriers;
    const adapter = courier ? adapterRegistry[courier.code] : undefined;
    if (!adapter || !courier) continue;

    checked++;
    try {
      const events = await adapter.trackShipment(shipment.awb);
      const latest = events[events.length - 1];
      if (latest && latest.status !== shipment.status) {
        await applyShipmentStatusUpdate(shipment.id, latest.status, latest.raw);
        updated++;
      }
    } catch (err) {
      failed++;
      await enqueueFailedOperation({
        operationType: "track_shipment",
        courierCode: courier.code,
        awb: shipment.awb,
        error: err,
      });
    }
  }

  return { checked, updated, failed };
}
