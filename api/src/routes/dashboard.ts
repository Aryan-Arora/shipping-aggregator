import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { getDashboardStats } from "../services/dashboardService";

export const dashboardRouter = Router();
dashboardRouter.use(requireAuth);

dashboardRouter.get("/stats", async (req, res) => {
  try {
    const stats = await getDashboardStats(req.sellerId);
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Failed to load stats" });
  }
});
