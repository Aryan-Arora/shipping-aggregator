import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { compareRates } from "../services/rateComparisonService";

export const ratesRouter = Router();
ratesRouter.use(requireAuth);

ratesRouter.post("/compare", async (req, res) => {
  const { pincode, weight } = req.body;

  if (!pincode || !weight) {
    return res.status(400).json({ error: "pincode and weight are required" });
  }

  try {
    const results = await compareRates(String(pincode), Number(weight));
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Rate comparison failed" });
  }
});
