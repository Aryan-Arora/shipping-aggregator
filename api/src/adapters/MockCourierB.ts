import { CourierAdapter, CreateShipmentInput, CreateShipmentResult, TrackingUpdate } from "./CourierAdapter";
import { mockTrackingStatus } from "./support/mockProgression";

function pincodeSeed(pincode: string): number {
  return pincode.split("").reduce((sum, ch) => sum + ch.charCodeAt(0) * 3, 0);
}

export const MockCourierB: CourierAdapter = {
  code: "mock_b",
  name: "Mock Courier B",

  async getRates(pincode, weightKg) {
    const seed = pincodeSeed(pincode);
    const serviceable = seed % 7 !== 0;
    return {
      price: Math.round((28 + weightKg * 22 + (seed % 30)) * 100) / 100,
      eta: `${1 + (seed % 4)}-${3 + (seed % 4)} days`,
      serviceable,
    };
  },

  async getServiceability(pincode) {
    return pincodeSeed(pincode) % 7 !== 0;
  },

  async createShipment(input: CreateShipmentInput): Promise<CreateShipmentResult> {
    const awb = `MCB${Date.now().toString(36).toUpperCase()}${Math.floor(Math.random() * 1000)}`;
    return { awb, status: "booked" };
  },

  async trackShipment(awb: string): Promise<TrackingUpdate[]> {
    const { status, occurredAt } = mockTrackingStatus(awb);
    return [{ status, occurredAt, raw: { awb } }];
  },

  async cancelShipment(_awb: string) {
    return true;
  },
};
