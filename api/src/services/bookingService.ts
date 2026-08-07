import { supabase } from "../config/supabase";
import { adapterRegistry } from "../adapters";

export interface BookShipmentInput {
  orderId: string;
  courierId: string;
  pickupLocationId: string;
  sellerId: string;
}

export async function bookShipment({ orderId, courierId, pickupLocationId, sellerId }: BookShipmentInput) {
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .eq("seller_id", sellerId)
    .single();

  if (orderError || !order) {
    throw new Error("Order not found");
  }

  const { data: courier, error: courierError } = await supabase
    .from("couriers")
    .select("*")
    .eq("id", courierId)
    .eq("is_active", true)
    .single();

  if (courierError || !courier) {
    throw new Error("Courier not found or inactive");
  }

  const { data: pickupLocation, error: pickupError } = await supabase
    .from("pickup_locations")
    .select("*")
    .eq("id", pickupLocationId)
    .eq("seller_id", sellerId)
    .single();

  if (pickupError || !pickupLocation) {
    throw new Error("Pickup location not found");
  }

  const adapter = adapterRegistry[courier.code];
  if (!adapter) {
    throw new Error(`No adapter registered for courier code ${courier.code}`);
  }

  const rate = await adapter.getRates(order.destination_pincode, order.weight_kg);
  const shipmentResult = await adapter.createShipment({
    orderId: order.id,
    pincode: order.destination_pincode,
    weightKg: order.weight_kg,
    paymentMode: order.payment_mode,
    codAmount: order.cod_amount,
  });

  const { data: shipment, error: shipmentError } = await supabase
    .from("shipments")
    .insert({
      order_id: order.id,
      courier_id: courier.id,
      pickup_location_id: pickupLocation.id,
      awb: shipmentResult.awb,
      status: shipmentResult.status,
      price: rate.price,
    })
    .select()
    .single();

  if (shipmentError) throw shipmentError;

  await supabase.from("shipment_events").insert({
    shipment_id: shipment.id,
    status: shipmentResult.status,
    raw_payload: { source: "booking", awb: shipmentResult.awb },
  });

  await supabase.from("orders").update({ status: "shipped" }).eq("id", order.id);

  return shipment;
}
