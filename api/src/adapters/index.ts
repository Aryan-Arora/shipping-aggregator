import { CourierAdapter } from "./CourierAdapter";
import { MockCourierA } from "./MockCourierA";
import { MockCourierB } from "./MockCourierB";
import { MockCourierC } from "./MockCourierC";
import { ShiprocketAdapter } from "./ShiprocketAdapter";

export const adapterRegistry: Record<string, CourierAdapter> = {
  mock_a: MockCourierA,
  mock_b: MockCourierB,
  mock_c: MockCourierC,
};

// Real adapters only register once their credentials exist — enabling a
// courier row in `couriers` without configuring its adapter just means
// rate comparison skips it gracefully (via Promise.allSettled), it doesn't crash.
if (process.env.SHIPROCKET_EMAIL && process.env.SHIPROCKET_PASSWORD) {
  adapterRegistry.shiprocket = ShiprocketAdapter;
}
