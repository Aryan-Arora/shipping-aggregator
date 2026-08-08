import { Router } from "express";
import { requireAuth, requireAdmin } from "../middleware/auth";
import {
  listSellers,
  updateSeller,
  listShipmentsAdmin,
  listCouriersWithPerformance,
  updateCourier,
  listNdrCasesAdmin,
  listCodRemittancesAdmin,
  getPlatformStats,
} from "../services/adminService";

export const adminRouter = Router();
adminRouter.use(requireAuth, requireAdmin);

adminRouter.get("/stats", async (_req, res) => {
  try {
    res.json(await getPlatformStats());
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Failed to load stats" });
  }
});

adminRouter.get("/sellers", async (_req, res) => {
  try {
    res.json(await listSellers());
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Failed to load sellers" });
  }
});

adminRouter.patch("/sellers/:id", async (req, res) => {
  if (req.params.id === req.sellerId && req.body.is_active === false) {
    return res.status(400).json({ error: "You cannot deactivate your own account" });
  }
  try {
    const { company_name, phone, is_active } = req.body;
    res.json(await updateSeller(req.params.id, { company_name, phone, is_active }));
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Update failed" });
  }
});

adminRouter.get("/shipments", async (req, res) => {
  try {
    const { sellerId, courierId, status, from, to } = req.query;
    res.json(
      await listShipmentsAdmin({
        sellerId: typeof sellerId === "string" ? sellerId : undefined,
        courierId: typeof courierId === "string" ? courierId : undefined,
        status: typeof status === "string" ? status : undefined,
        from: typeof from === "string" ? from : undefined,
        to: typeof to === "string" ? to : undefined,
      })
    );
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Failed to load shipments" });
  }
});

adminRouter.get("/couriers", async (_req, res) => {
  try {
    res.json(await listCouriersWithPerformance());
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Failed to load couriers" });
  }
});

adminRouter.patch("/couriers/:id", async (req, res) => {
  try {
    const { is_active } = req.body;
    res.json(await updateCourier(req.params.id, { is_active }));
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Update failed" });
  }
});

adminRouter.get("/ndr", async (_req, res) => {
  try {
    res.json(await listNdrCasesAdmin());
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Failed to load NDR cases" });
  }
});

adminRouter.get("/cod", async (_req, res) => {
  try {
    res.json(await listCodRemittancesAdmin());
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Failed to load COD remittances" });
  }
});
