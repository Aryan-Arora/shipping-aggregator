import { supabase } from "../config/supabase";

const IN_TRANSIT_STATUSES = ["picked_up", "in_transit"];

export async function getDashboardStats(sellerId: string) {
  const { data: shipments, error } = await supabase
    .from("shipments")
    .select(
      "id, status, price, booked_at, last_status_at, awb, orders!inner(seller_id, order_ref, customer_name, payment_mode, cod_amount, status), couriers(name, code)"
    )
    .eq("orders.seller_id", sellerId)
    .order("booked_at", { ascending: false });

  if (error) throw error;

  const all = shipments ?? [];

  const totalShipments = all.length;
  const inTransit = all.filter((s) => IN_TRANSIT_STATUSES.includes(s.status)).length;
  const delivered = all.filter((s) => s.status === "delivered").length;

  const { count: ndrOpen } = await supabase
    .from("ndr_cases")
    .select("id, shipments!inner(orders!inner(seller_id))", { count: "exact", head: true })
    .eq("shipments.orders.seller_id", sellerId)
    .eq("status", "open");

  const codPendingAmount = all
    .filter((s) => {
      const order = Array.isArray(s.orders) ? s.orders[0] : s.orders;
      return order?.payment_mode === "cod" && s.status !== "delivered";
    })
    .reduce((sum, s) => {
      const order = Array.isArray(s.orders) ? s.orders[0] : s.orders;
      return sum + (order?.cod_amount ?? 0);
    }, 0);

  const courierVolumeMap = new Map<string, number>();
  for (const s of all) {
    const courier = Array.isArray(s.couriers) ? s.couriers[0] : s.couriers;
    const name = courier?.name ?? "Unknown";
    courierVolumeMap.set(name, (courierVolumeMap.get(name) ?? 0) + 1);
  }
  const courierVolume = Array.from(courierVolumeMap.entries()).map(([courierName, count]) => ({
    courierName,
    count,
  }));

  const recentShipments = all.slice(0, 5).map((s) => {
    const order = Array.isArray(s.orders) ? s.orders[0] : s.orders;
    const courier = Array.isArray(s.couriers) ? s.couriers[0] : s.couriers;
    return {
      id: s.id,
      awb: s.awb,
      status: s.status,
      orderRef: order?.order_ref,
      courierName: courier?.name,
      lastStatusAt: s.last_status_at,
    };
  });

  return {
    totalShipments,
    inTransit,
    delivered,
    ndrOpen: ndrOpen ?? 0,
    codPendingAmount,
    courierVolume,
    recentShipments,
  };
}
