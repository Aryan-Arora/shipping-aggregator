import { Router } from "express";
import { supabase } from "../config/supabase";
import { requireAuth } from "../middleware/auth";
import { bookShipment } from "../services/bookingService";

export const shipmentsRouter = Router();
shipmentsRouter.use(requireAuth);

shipmentsRouter.get("/", async (req, res) => {
  const { data, error } = await supabase
    .from("shipments")
    .select("*, orders!inner(seller_id, order_ref, customer_name), couriers(name, code)")
    .eq("orders.seller_id", req.sellerId)
    .order("booked_at", { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

shipmentsRouter.get("/:id", async (req, res) => {
  const { data: shipment, error } = await supabase
    .from("shipments")
    .select("*, orders!inner(seller_id, order_ref, customer_name), couriers(name, code)")
    .eq("id", req.params.id)
    .eq("orders.seller_id", req.sellerId)
    .single();

  if (error || !shipment) return res.status(404).json({ error: "Shipment not found" });

  const { data: events } = await supabase
    .from("shipment_events")
    .select("*")
    .eq("shipment_id", shipment.id)
    .order("occurred_at", { ascending: true });

  res.json({ ...shipment, events: events ?? [] });
});

shipmentsRouter.post("/", async (req, res) => {
  const { orderId, courierId, pickupLocationId } = req.body;

  if (!orderId || !courierId || !pickupLocationId) {
    return res.status(400).json({ error: "orderId, courierId, and pickupLocationId are required" });
  }

  try {
    const shipment = await bookShipment({
      orderId,
      courierId,
      pickupLocationId,
      sellerId: req.sellerId,
    });
    res.status(201).json(shipment);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Booking failed" });
  }
});
