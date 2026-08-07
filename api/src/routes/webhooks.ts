import { Router } from "express";
import { supabase } from "../config/supabase";

export const webhooksRouter = Router();

const NDR_STATUSES = new Set(["ndr", "delivery_failed"]);

// Mock couriers have no real signature to validate; a real adapter would
// verify a per-courier signature header here before trusting the payload.
webhooksRouter.post("/:courierCode", async (req, res) => {
  const { courierCode } = req.params;
  const { awb, status, reason } = req.body;

  if (!awb || !status) {
    return res.status(400).json({ error: "awb and status are required" });
  }

  const { data: courier } = await supabase
    .from("couriers")
    .select("id")
    .eq("code", courierCode)
    .single();

  if (!courier) {
    return res.status(404).json({ error: "Unknown courier" });
  }

  const { data: shipment, error: shipmentError } = await supabase
    .from("shipments")
    .select("id, courier_id")
    .eq("awb", awb)
    .eq("courier_id", courier.id)
    .single();

  if (shipmentError || !shipment) {
    return res.status(404).json({ error: "Shipment not found for this AWB/courier" });
  }

  await supabase.from("shipment_events").insert({
    shipment_id: shipment.id,
    status,
    raw_payload: req.body,
  });

  await supabase
    .from("shipments")
    .update({ status, last_status_at: new Date().toISOString() })
    .eq("id", shipment.id);

  if (NDR_STATUSES.has(String(status).toLowerCase())) {
    const { data: existingCase } = await supabase
      .from("ndr_cases")
      .select("id, attempts")
      .eq("shipment_id", shipment.id)
      .eq("status", "open")
      .maybeSingle();

    if (existingCase) {
      await supabase
        .from("ndr_cases")
        .update({ attempts: existingCase.attempts + 1, reason })
        .eq("id", existingCase.id);
    } else {
      await supabase.from("ndr_cases").insert({
        shipment_id: shipment.id,
        reason,
        attempts: 1,
        status: "open",
      });
    }
  }

  res.json({ received: true });
});
