export interface RateQuote {
  price: number;
  eta: string;
  serviceable: boolean;
}

export interface CreateShipmentInput {
  orderId: string;
  pincode: string;
  weightKg: number;
  paymentMode: "prepaid" | "cod";
  codAmount?: number | null;
}

export interface CreateShipmentResult {
  awb: string;
  status: string;
}

export interface TrackingUpdate {
  status: string;
  occurredAt: string;
  raw: Record<string, unknown>;
}

export interface CourierAdapter {
  code: string;
  name: string;
  getRates(pincode: string, weightKg: number): Promise<RateQuote>;
  getServiceability(pincode: string): Promise<boolean>;
  createShipment(input: CreateShipmentInput): Promise<CreateShipmentResult>;
  trackShipment(awb: string): Promise<TrackingUpdate[]>;
  cancelShipment(awb: string): Promise<boolean>;
}
