import { Router } from "express";
import { supabase } from "../config/supabase";
import { requireAuth } from "../middleware/auth";

export const pickupLocationsRouter = Router();
pickupLocationsRouter.use(requireAuth);

pickupLocationsRouter.get("/", async (req, res) => {
  const { data, error } = await supabase
    .from("pickup_locations")
    .select("*")
    .eq("seller_id", req.sellerId)
    .order("created_at", { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

pickupLocationsRouter.post("/", async (req, res) => {
  const { label, address_line1, address_line2, city, state, pincode, is_default } = req.body;

  if (!label || !address_line1 || !city || !state || !pincode) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  if (is_default) {
    await supabase
      .from("pickup_locations")
      .update({ is_default: false })
      .eq("seller_id", req.sellerId);
  }

  const { data, error } = await supabase
    .from("pickup_locations")
    .insert({
      seller_id: req.sellerId,
      label,
      address_line1,
      address_line2,
      city,
      state,
      pincode,
      is_default: !!is_default,
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

pickupLocationsRouter.patch("/:id", async (req, res) => {
  const { id } = req.params;
  const { is_default, ...rest } = req.body;

  if (is_default) {
    await supabase
      .from("pickup_locations")
      .update({ is_default: false })
      .eq("seller_id", req.sellerId);
  }

  const { data, error } = await supabase
    .from("pickup_locations")
    .update({ ...rest, ...(is_default !== undefined ? { is_default } : {}) })
    .eq("id", id)
    .eq("seller_id", req.sellerId)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

pickupLocationsRouter.delete("/:id", async (req, res) => {
  const { id } = req.params;
  const { error } = await supabase
    .from("pickup_locations")
    .delete()
    .eq("id", id)
    .eq("seller_id", req.sellerId);

  if (error) return res.status(500).json({ error: error.message });
  res.status(204).send();
});
