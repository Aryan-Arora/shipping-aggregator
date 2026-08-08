import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../adapters", () => ({ adapterRegistry: {} as Record<string, any> }));

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }));
vi.mock("../config/supabase", () => ({ supabase: { from: mockFrom } }));

import { adapterRegistry } from "../adapters";
import { compareRates } from "./rateComparisonService";

function mockActiveCouriers(couriers: { id: string; code: string; name: string }[]) {
  mockFrom.mockReturnValue({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn(() => Promise.resolve({ data: couriers, error: null })),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  for (const key of Object.keys(adapterRegistry)) delete (adapterRegistry as any)[key];
});

describe("compareRates", () => {
  it("returns a normalized quote for a serviceable courier", async () => {
    mockActiveCouriers([{ id: "c1", code: "mock_x", name: "Mock X" }]);
    (adapterRegistry as any).mock_x = {
      getRates: vi.fn().mockResolvedValue({ price: 100, eta: "2-3 days", serviceable: true }),
    };

    const result = await compareRates("110001", 1.5);

    expect(result).toEqual([
      {
        courierId: "c1",
        courierCode: "mock_x",
        courierName: "Mock X",
        price: 100,
        eta: "2-3 days",
        serviceable: true,
      },
    ]);
  });

  it("does not let one courier's failure break the others (Promise.allSettled)", async () => {
    mockActiveCouriers([
      { id: "c1", code: "mock_ok", name: "Mock OK" },
      { id: "c2", code: "mock_fail", name: "Mock Fail" },
    ]);
    (adapterRegistry as any).mock_ok = {
      getRates: vi.fn().mockResolvedValue({ price: 50, eta: "1-2 days", serviceable: true }),
    };
    (adapterRegistry as any).mock_fail = {
      getRates: vi.fn().mockRejectedValue(new Error("courier API down")),
    };

    const result = await compareRates("110001", 1);

    expect(result).toHaveLength(2);
    const ok = result.find((r) => r.courierCode === "mock_ok");
    const failed = result.find((r) => r.courierCode === "mock_fail");
    expect(ok?.serviceable).toBe(true);
    expect(ok?.price).toBe(50);
    expect(failed?.serviceable).toBe(false);
    expect(failed?.price).toBeNull();
    expect(failed?.error).toBe("courier API down");
  });

  it("reports an error rather than throwing when a courier has no registered adapter", async () => {
    mockActiveCouriers([{ id: "c1", code: "unregistered", name: "Ghost Courier" }]);

    const result = await compareRates("110001", 1);

    expect(result).toHaveLength(1);
    expect(result[0].serviceable).toBe(false);
    expect(result[0].error).toContain("No adapter registered");
  });

  it("returns an empty list when there are no active couriers", async () => {
    mockActiveCouriers([]);
    const result = await compareRates("110001", 1);
    expect(result).toEqual([]);
  });
});
