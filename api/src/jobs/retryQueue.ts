import { supabase } from "../config/supabase";
import { adapterRegistry } from "../adapters";
import { applyShipmentStatusUpdate } from "../services/shipmentEventService";

interface FailedOperationRow {
  id: string;
  operation_type: string;
  courier_code: string;
  awb: string | null;
  payload: Record<string, unknown>;
  attempts: number;
  max_attempts: number;
}

export async function enqueueFailedOperation(params: {
  operationType: string;
  courierCode: string;
  awb?: string;
  payload?: Record<string, unknown>;
  error: unknown;
}) {
  const { operationType, courierCode, awb, payload, error } = params;
  await supabase.from("failed_operations").insert({
    operation_type: operationType,
    courier_code: courierCode,
    awb: awb ?? null,
    payload: payload ?? {},
    last_error: error instanceof Error ? error.message : String(error),
  });
}

async function processTrackShipment(entry: FailedOperationRow) {
  if (!entry.awb) throw new Error("Missing AWB on queued track_shipment operation");
  const adapter = adapterRegistry[entry.courier_code];
  if (!adapter) throw new Error(`No adapter registered for courier ${entry.courier_code}`);

  const events = await adapter.trackShipment(entry.awb);
  const latest = events[events.length - 1];
  if (!latest) return;

  const { data: shipment } = await supabase
    .from("shipments")
    .select("id, status")
    .eq("awb", entry.awb)
    .single();

  if (shipment && latest.status !== shipment.status) {
    await applyShipmentStatusUpdate(shipment.id, latest.status, latest.raw);
  }
}

// Extend this as more operation types get queued (e.g. cancel_shipment,
// create_shipment) — each just needs to know how to redo itself from the
// stored payload.
const PROCESSORS: Record<string, (entry: FailedOperationRow) => Promise<void>> = {
  track_shipment: processTrackShipment,
};

export async function processRetryQueue() {
  const { data: pending, error } = await supabase
    .from("failed_operations")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(50);

  if (error) throw error;

  let succeeded = 0;
  let abandoned = 0;
  let stillPending = 0;
  let skipped = 0;

  for (const entry of (pending ?? []) as FailedOperationRow[]) {
    const processor = PROCESSORS[entry.operation_type];
    if (!processor) {
      skipped++;
      continue;
    }

    try {
      await processor(entry);
      await supabase
        .from("failed_operations")
        .update({ status: "succeeded", updated_at: new Date().toISOString() })
        .eq("id", entry.id);
      succeeded++;
    } catch (err) {
      const attempts = entry.attempts + 1;
      const nextStatus = attempts >= entry.max_attempts ? "abandoned" : "pending";
      await supabase
        .from("failed_operations")
        .update({
          attempts,
          status: nextStatus,
          last_error: err instanceof Error ? err.message : String(err),
          updated_at: new Date().toISOString(),
        })
        .eq("id", entry.id);
      if (nextStatus === "abandoned") abandoned++;
      else stillPending++;
    }
  }

  return { processed: (pending ?? []).length, succeeded, abandoned, stillPending, skipped };
}
