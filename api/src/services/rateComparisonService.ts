import { supabase } from "../config/supabase";
import { adapterRegistry } from "../adapters";

export interface RateComparisonResult {
  courierId: string;
  courierCode: string;
  courierName: string;
  price: number | null;
  eta: string | null;
  serviceable: boolean;
  error?: string;
}

export async function compareRates(pincode: string, weightKg: number): Promise<RateComparisonResult[]> {
  const { data: couriers, error } = await supabase
    .from("couriers")
    .select("id, code, name")
    .eq("is_active", true);

  if (error) throw error;

  const settled = await Promise.allSettled(
    (couriers ?? []).map(async (courier) => {
      const adapter = adapterRegistry[courier.code];
      if (!adapter) {
        throw new Error(`No adapter registered for courier code ${courier.code}`);
      }
      const rate = await adapter.getRates(pincode, weightKg);
      return {
        courierId: courier.id,
        courierCode: courier.code,
        courierName: courier.name,
        price: rate.price,
        eta: rate.eta,
        serviceable: rate.serviceable,
      } satisfies RateComparisonResult;
    })
  );

  return settled.map((result, i) => {
    if (result.status === "fulfilled") return result.value;
    const courier = couriers![i];
    return {
      courierId: courier.id,
      courierCode: courier.code,
      courierName: courier.name,
      price: null,
      eta: null,
      serviceable: false,
      error: result.reason instanceof Error ? result.reason.message : "Unknown error",
    };
  });
}
