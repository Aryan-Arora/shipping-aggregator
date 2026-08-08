import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { getCodReconciliation } from "../services/codService";

export const codRouter = Router();
codRouter.use(requireAuth);

codRouter.get("/reconciliation", async (req, res) => {
  try {
    const rows = await getCodReconciliation(req.sellerId);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Failed to load COD reconciliation" });
  }
});
