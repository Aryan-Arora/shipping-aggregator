import "dotenv/config";
import express from "express";
import cors from "cors";
import { healthRouter } from "./routes/health";
import { pickupLocationsRouter } from "./routes/pickupLocations";
import { ordersRouter } from "./routes/orders";
import { ratesRouter } from "./routes/rates";
import { shipmentsRouter } from "./routes/shipments";
import { webhooksRouter } from "./routes/webhooks";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/health", healthRouter);
app.use("/pickup-locations", pickupLocationsRouter);
app.use("/orders", ordersRouter);
app.use("/rates", ratesRouter);
app.use("/shipments", shipmentsRouter);
app.use("/webhooks", webhooksRouter);

const port = process.env.PORT ? Number(process.env.PORT) : 4000;
app.listen(port, () => {
  console.log(`shipping-aggregator-api listening on port ${port}`);
});
