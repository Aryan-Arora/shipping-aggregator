import { supabase } from "../config/supabase";

const NDR_STATUSES = new Set(["ndr", "delivery_failed"]);

// Shared by the webhook route and the tracking-reconciliation job — both
// paths need to record a status change and auto-open an NDR case the same
// way, whether the update came from a courier's push or our own poll.
export async function applyShipmentStatusUpdate(
  shipmentId: string,
  status: string,
  rawPayload: Record<string, unknown>,
  reason?: string
) {
  await supabase.from("shipment_events").insert({
    shipment_id: shipmentId,
    status,
    raw_payload: rawPayload,
  });

  await supabase
    .from("shipments")
    .update({ status, last_status_at: new Date().toISOString() })
    .eq("id", shipmentId);

  if (NDR_STATUSES.has(status.toLowerCase())) {
    const { data: existingCase } = await supabase
      .from("ndr_cases")
      .select("id, attempts")
      .eq("shipment_id", shipmentId)
      .eq("status", "open")
      .maybeSingle();

    if (existingCase) {
      await supabase
        .from("ndr_cases")
        .update({ attempts: existingCase.attempts + 1, reason })
        .eq("id", existingCase.id);
    } else {
      await supabase.from("ndr_cases").insert({
        shipment_id: shipmentId,
        reason,
        attempts: 1,
        status: "open",
      });
    }
  }
}
