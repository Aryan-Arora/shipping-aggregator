import { CourierAdapter } from "./CourierAdapter";
import { MockCourierA } from "./MockCourierA";
import { MockCourierB } from "./MockCourierB";
import { MockCourierC } from "./MockCourierC";

export const adapterRegistry: Record<string, CourierAdapter> = {
  mock_a: MockCourierA,
  mock_b: MockCourierB,
  mock_c: MockCourierC,
};
