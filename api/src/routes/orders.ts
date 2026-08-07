import { Router } from "express";
import { supabase } from "../config/supabase";
import { requireAuth } from "../middleware/auth";

export const ordersRouter = Router();
ordersRouter.use(requireAuth);

ordersRouter.get("/", async (req, res) => {
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("seller_id", req.sellerId)
    .order("created_at", { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

ordersRouter.get("/:id", async (req, res) => {
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("id", req.params.id)
    .eq("seller_id", req.sellerId)
    .single();

  if (error) return res.status(404).json({ error: "Order not found" });
  res.json(data);
});

ordersRouter.post("/", async (req, res) => {
  const {
    order_ref,
    customer_name,
    customer_phone,
    destination_address,
    destination_pincode,
    weight_kg,
    payment_mode,
    cod_amount,
  } = req.body;

  if (
    !order_ref ||
    !customer_name ||
    !destination_address ||
    !destination_pincode ||
    !weight_kg ||
    !payment_mode
  ) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  if (payment_mode === "cod" && !cod_amount) {
    return res.status(400).json({ error: "cod_amount is required for COD orders" });
  }

  const { data, error } = await supabase
    .from("orders")
    .insert({
      seller_id: req.sellerId,
      order_ref,
      customer_name,
      customer_phone,
      destination_address,
      destination_pincode,
      weight_kg,
      payment_mode,
      cod_amount: payment_mode === "cod" ? cod_amount : null,
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

ordersRouter.patch("/:id", async (req, res) => {
  const { data, error } = await supabase
    .from("orders")
    .update(req.body)
    .eq("id", req.params.id)
    .eq("seller_id", req.sellerId)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

ordersRouter.delete("/:id", async (req, res) => {
  const { error } = await supabase
    .from("orders")
    .delete()
    .eq("id", req.params.id)
    .eq("seller_id", req.sellerId);

  if (error) return res.status(500).json({ error: error.message });
  res.status(204).send();
});
