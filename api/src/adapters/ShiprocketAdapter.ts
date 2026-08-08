import {
  CourierAdapter,
  CreateShipmentInput,
  CreateShipmentResult,
  RateQuote,
  TrackingUpdate,
} from "./CourierAdapter";
import { getCachedToken } from "./support/aggregatorAuth";
import { aggregatorRequest } from "./support/httpClient";

// Shiprocket's actual documented v1 external API shape — real endpoints, but
// unusable until SHIPROCKET_EMAIL/PASSWORD are set with a real account.
// Not wired into the adapter registry unless those env vars are present
// (see adapters/index.ts), so it's inert until credentials exist.
const BASE_URL = process.env.SHIPROCKET_API_BASE_URL ?? "https://apiv2.shiprocket.in/v1/external";

async function getToken(): Promise<string> {
  return getCachedToken("shiprocket", async () => {
    const email = process.env.SHIPROCKET_EMAIL;
    const password = process.env.SHIPROCKET_PASSWORD;
    if (!email || !password) {
      throw new Error("SHIPROCKET_EMAIL / SHIPROCKET_PASSWORD are not configured");
    }

    const res = await aggregatorRequest<{ token: string }>(`${BASE_URL}/auth/login`, {
      method: "POST",
      body: { email, password },
    });

    // Shiprocket tokens are valid for ~10 days; refreshing hourly is a
    // conservative default until the real expiry is confirmed against a
    // live account.
    return { token: res.token, expiresInSeconds: 60 * 60 };
  });
}

async function authedRequest<T>(path: string, options: Parameters<typeof aggregatorRequest>[1] = {}) {
  const token = await getToken();
  return aggregatorRequest<T>(`${BASE_URL}${path}`, {
    ...options,
    headers: { Authorization: `Bearer ${token}`, ...options.headers },
  });
}

// TODO(real-integration): CourierAdapter.getRates only receives the
// destination pincode + weight. Shiprocket's serviceability/rate check also
// needs the pickup pincode and COD-vs-prepaid mode. Once this adapter is
// actually enabled, extend CourierAdapter to pass the seller's chosen pickup
// location through — for now this falls back to SHIPROCKET_PICKUP_PINCODE.
interface ShiprocketServiceabilityResponse {
  data: {
    available_courier_companies: {
      rate: number;
      etd: string;
    }[];
  };
}

export const ShiprocketAdapter: CourierAdapter = {
  code: "shiprocket",
  name: "Shiprocket",

  async getRates(pincode: string, weightKg: number): Promise<RateQuote> {
    const pickupPincode = process.env.SHIPROCKET_PICKUP_PINCODE;
    if (!pickupPincode) {
      throw new Error("SHIPROCKET_PICKUP_PINCODE is not configured");
    }

    const res = await authedRequest<ShiprocketServiceabilityResponse>(
      `/courier/serviceability/?pickup_postcode=${pickupPincode}&delivery_postcode=${pincode}&weight=${weightKg}&cod=0`
    );

    const cheapest = res.data.available_courier_companies?.sort((a, b) => a.rate - b.rate)[0];
    if (!cheapest) {
      return { price: 0, eta: "", serviceable: false };
    }

    return { price: cheapest.rate, eta: cheapest.etd, serviceable: true };
  },

  async getServiceability(pincode: string): Promise<boolean> {
    const rate = await this.getRates(pincode, 1);
    return rate.serviceable;
  },

  async createShipment(input: CreateShipmentInput): Promise<CreateShipmentResult> {
    // TODO(real-integration): Shiprocket's /orders/create/adhoc needs full
    // order line items, seller pickup location ID, and customer address —
    // CreateShipmentInput carries only what the mock adapters needed. Extend
    // it with the fields this call requires before enabling for real.
    const res = await authedRequest<{ awb_code: string; status: string }>(
      "/orders/create/adhoc",
      { method: "POST", body: input }
    );
    return { awb: res.awb_code, status: res.status };
  },

  async trackShipment(awb: string): Promise<TrackingUpdate[]> {
    const res = await authedRequest<{
      tracking_data: { shipment_track: { status: string; date: string }[] };
    }>(`/courier/track/awb/${awb}`);

    return (res.tracking_data?.shipment_track ?? []).map((event) => ({
      status: event.status,
      occurredAt: event.date,
      raw: event,
    }));
  },

  async cancelShipment(awb: string): Promise<boolean> {
    await authedRequest("/orders/cancel", { method: "POST", body: { awbs: [awb] } });
    return true;
  },
};
