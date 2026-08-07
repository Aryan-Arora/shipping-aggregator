import { CourierAdapter, CreateShipmentInput, CreateShipmentResult, TrackingUpdate } from "./CourierAdapter";

function pincodeSeed(pincode: string): number {
  return pincode.split("").reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
}

export const MockCourierA: CourierAdapter = {
  code: "mock_a",
  name: "Mock Courier A",

  async getRates(pincode, weightKg) {
    const seed = pincodeSeed(pincode);
    const serviceable = seed % 11 !== 0;
    return {
      price: Math.round((35 + weightKg * 18 + (seed % 40)) * 100) / 100,
      eta: `${2 + (seed % 3)}-${4 + (seed % 3)} days`,
      serviceable,
    };
  },

  async getServiceability(pincode) {
    return pincodeSeed(pincode) % 11 !== 0;
  },

  async createShipment(input: CreateShipmentInput): Promise<CreateShipmentResult> {
    const awb = `MCA${Date.now().toString(36).toUpperCase()}${Math.floor(Math.random() * 1000)}`;
    return { awb, status: "booked" };
  },

  async trackShipment(awb: string): Promise<TrackingUpdate[]> {
    return [{ status: "booked", occurredAt: new Date().toISOString(), raw: { awb } }];
  },

  async cancelShipment(_awb: string) {
    return true;
  },
};
