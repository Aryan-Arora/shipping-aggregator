import { CourierAdapter, CreateShipmentInput, CreateShipmentResult, TrackingUpdate } from "./CourierAdapter";
import { mockTrackingStatus } from "./support/mockProgression";

function pincodeSeed(pincode: string): number {
  return pincode.split("").reduce((sum, ch) => sum + ch.charCodeAt(0) * 7, 0);
}

export const MockCourierC: CourierAdapter = {
  code: "mock_c",
  name: "Mock Courier C",

  async getRates(pincode, weightKg) {
    const seed = pincodeSeed(pincode);
    const serviceable = seed % 13 !== 0;
    return {
      price: Math.round((40 + weightKg * 15 + (seed % 50)) * 100) / 100,
      eta: `${3 + (seed % 2)}-${5 + (seed % 2)} days`,
      serviceable,
    };
  },

  async getServiceability(pincode) {
    return pincodeSeed(pincode) % 13 !== 0;
  },

  async createShipment(input: CreateShipmentInput): Promise<CreateShipmentResult> {
    const awb = `MCC${Date.now().toString(36).toUpperCase()}${Math.floor(Math.random() * 1000)}`;
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
