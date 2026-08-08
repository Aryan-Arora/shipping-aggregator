import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import {
  listNdrCases,
  reattemptNdrCase,
  cancelNdrCase,
  resolveNdrCase,
  escalateNdrCase,
} from "../services/ndrService";

export const ndrRouter = Router();
ndrRouter.use(requireAuth);

ndrRouter.get("/", async (req, res) => {
  try {
    const cases = await listNdrCases(req.sellerId);
    res.json(cases);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Failed to load NDR cases" });
  }
});

async function handleAction(
  action: (id: string, sellerId: string) => Promise<unknown>,
  req: Parameters<import("express").RequestHandler>[0],
  res: Parameters<import("express").RequestHandler>[1]
) {
  try {
    const updated = await action(req.params.id, req.sellerId);
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Action failed" });
  }
}

ndrRouter.post("/:id/reattempt", (req, res) => handleAction(reattemptNdrCase, req, res));
ndrRouter.post("/:id/cancel", (req, res) => handleAction(cancelNdrCase, req, res));
ndrRouter.post("/:id/resolve", (req, res) => handleAction(resolveNdrCase, req, res));
ndrRouter.post("/:id/escalate", (req, res) => handleAction(escalateNdrCase, req, res));
