import "dotenv/config";
import express from "express";
import cors from "cors";
import { healthRouter } from "./routes/health";
import { pickupLocationsRouter } from "./routes/pickupLocations";
import { ordersRouter } from "./routes/orders";
import { ratesRouter } from "./routes/rates";
import { shipmentsRouter } from "./routes/shipments";
import { webhooksRouter } from "./routes/webhooks";
import { dashboardRouter } from "./routes/dashboard";
import { ndrRouter } from "./routes/ndr";
import { codRouter } from "./routes/cod";
import { adminRouter } from "./routes/admin";
import { reconcileStaleShipments } from "./jobs/trackingReconciliation";
import { processRetryQueue } from "./jobs/retryQueue";
import { runCodReconciliation } from "./jobs/codReconciliation";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/health", healthRouter);
app.use("/pickup-locations", pickupLocationsRouter);
app.use("/orders", ordersRouter);
app.use("/rates", ratesRouter);
app.use("/shipments", shipmentsRouter);
app.use("/webhooks", webhooksRouter);
app.use("/dashboard", dashboardRouter);
app.use("/ndr", ndrRouter);
app.use("/cod", codRouter);
app.use("/admin", adminRouter);

const port = process.env.PORT ? Number(process.env.PORT) : 4000;
app.listen(port, () => {
  console.log(`shipping-aggregator-api listening on port ${port}`);
});

// No real cron infra yet (Tier 15 in docs/business-readiness-roadmap.md) —
// these in-process intervals are the stand-in. Each job is also triggerable
// on demand via /admin/jobs/* for testing without waiting on the clock.
// Set BACKGROUND_JOBS=false to disable entirely (e.g. in a multi-instance
// deploy where only one instance should run them).
if (process.env.BACKGROUND_JOBS !== "false") {
  const TRACKING_INTERVAL_MS = Number(process.env.TRACKING_RECONCILIATION_INTERVAL_MS ?? 15 * 60 * 1000);
  const RETRY_QUEUE_INTERVAL_MS = Number(process.env.RETRY_QUEUE_INTERVAL_MS ?? 2 * 60 * 1000);
  const COD_RECONCILIATION_INTERVAL_MS = Number(process.env.COD_RECONCILIATION_INTERVAL_MS ?? 24 * 60 * 60 * 1000);

  setInterval(() => {
    reconcileStaleShipments().catch((err) => console.error("[trackingReconciliation]", err));
  }, TRACKING_INTERVAL_MS);

  setInterval(() => {
    processRetryQueue().catch((err) => console.error("[retryQueue]", err));
  }, RETRY_QUEUE_INTERVAL_MS);

  setInterval(() => {
    runCodReconciliation().catch((err) => console.error("[codReconciliation]", err));
  }, COD_RECONCILIATION_INTERVAL_MS);

  console.log("Background jobs scheduled: trackingReconciliation, retryQueue, codReconciliation");
}
