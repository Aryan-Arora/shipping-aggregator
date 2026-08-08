import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../adapters", () => ({ adapterRegistry: {} as Record<string, any> }));

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }));
vi.mock("../config/supabase", () => ({ supabase: { from: mockFrom } }));

import { adapterRegistry } from "../adapters";
import { bookShipment } from "./bookingService";

function makeBuilder(finalResult: { data: any; error: any }) {
  const builder: any = {};
  builder.select = vi.fn(() => builder);
  builder.eq = vi.fn(() => builder);
  builder.insert = vi.fn(() => builder);
  builder.update = vi.fn(() => builder);
  builder.single = vi.fn(() => Promise.resolve(finalResult));
  builder.then = (resolve: any, reject: any) => Promise.resolve(finalResult).then(resolve, reject);
  return builder;
}

const order = {
  id: "order-1",
  seller_id: "seller-1",
  destination_pincode: "110001",
  weight_kg: 1.5,
  payment_mode: "prepaid",
  cod_amount: null,
};
const courier = { id: "courier-1", code: "mock_x", is_active: true };
const pickupLocation = { id: "pickup-1", seller_id: "seller-1" };
const shipment = { id: "shipment-1", awb: "AWB123", status: "booked" };

let builders: Record<string, ReturnType<typeof makeBuilder>>;

function setupHappyPath(overrides: Partial<Record<string, { data: any; error: any }>> = {}) {
  const results: Record<string, { data: any; error: any }> = {
    orders: { data: order, error: null },
    couriers: { data: courier, error: null },
    pickup_locations: { data: pickupLocation, error: null },
    shipments: { data: shipment, error: null },
    shipment_events: { data: null, error: null },
    ...overrides,
  };
  builders = Object.fromEntries(Object.entries(results).map(([table, result]) => [table, makeBuilder(result)]));
  mockFrom.mockImplementation((table: string) => builders[table]);

  (adapterRegistry as any).mock_x = {
    getRates: vi.fn().mockResolvedValue({ price: 120, eta: "2-3 days", serviceable: true }),
    createShipment: vi.fn().mockResolvedValue({ awb: "AWB123", status: "booked" }),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  for (const key of Object.keys(adapterRegistry)) delete (adapterRegistry as any)[key];
});

describe("bookShipment", () => {
  it("creates a shipment via the courier adapter and marks the order shipped", async () => {
    setupHappyPath();

    const result = await bookShipment({
      orderId: "order-1",
      courierId: "courier-1",
      pickupLocationId: "pickup-1",
      sellerId: "seller-1",
    });

    expect(result).toEqual(shipment);
    expect(builders.shipments.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        order_id: "order-1",
        courier_id: "courier-1",
        pickup_location_id: "pickup-1",
        awb: "AWB123",
        status: "booked",
        price: 120,
      })
    );
    expect(builders.orders.update).toHaveBeenCalledWith({ status: "shipped" });
  });

  it("rejects an order that doesn't belong to the requesting seller (never trusts a client-supplied sellerId)", async () => {
    setupHappyPath({ orders: { data: null, error: { message: "not found" } } });

    await expect(
      bookShipment({
        orderId: "order-1",
        courierId: "courier-1",
        pickupLocationId: "pickup-1",
        sellerId: "someone-elses-seller-id",
      })
    ).rejects.toThrow("Order not found");

    // The seller-scoping is enforced in the query itself, not after the fact.
    expect(builders.orders.eq).toHaveBeenCalledWith("seller_id", "someone-elses-seller-id");
  });

  it("rejects an inactive courier", async () => {
    setupHappyPath({ couriers: { data: null, error: { message: "not found" } } });

    await expect(
      bookShipment({ orderId: "order-1", courierId: "courier-1", pickupLocationId: "pickup-1", sellerId: "seller-1" })
    ).rejects.toThrow("Courier not found or inactive");
  });

  it("rejects a pickup location that isn't the seller's own", async () => {
    setupHappyPath({ pickup_locations: { data: null, error: { message: "not found" } } });

    await expect(
      bookShipment({ orderId: "order-1", courierId: "courier-1", pickupLocationId: "pickup-1", sellerId: "seller-1" })
    ).rejects.toThrow("Pickup location not found");
  });

  it("rejects when no adapter is registered for the courier's code", async () => {
    setupHappyPath();
    delete (adapterRegistry as any).mock_x;

    await expect(
      bookShipment({ orderId: "order-1", courierId: "courier-1", pickupLocationId: "pickup-1", sellerId: "seller-1" })
    ).rejects.toThrow("No adapter registered for courier code mock_x");
  });
});
