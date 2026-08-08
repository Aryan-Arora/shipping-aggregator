import { Router } from "express";
import { supabase } from "../config/supabase";
import { webhookVerifiers } from "../adapters/support/webhookVerifiers";
import { applyShipmentStatusUpdate } from "../services/shipmentEventService";

export const webhooksRouter = Router();

webhooksRouter.post("/:courierCode", async (req, res) => {
  const { courierCode } = req.params;
  const { awb, status, reason } = req.body;

  // Mock couriers have no entry here, so verification is skipped for them.
  // A real courier's entry gates on it — an unconfigured secret fails closed.
  const verify = webhookVerifiers[courierCode];
  if (verify && !verify(req)) {
    return res.status(401).json({ error: "Invalid webhook signature" });
  }

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

  await applyShipmentStatusUpdate(shipment.id, status, req.body, reason);

  res.json({ received: true });
});
