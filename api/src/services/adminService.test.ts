import { describe, it, expect } from "vitest";
import { assertNotSelfDeactivation, SelfDeactivationError } from "./adminService";

// Regression test for the lockout bug caught live during Tier 10: an admin
// deactivating the only account (including their own) locks everyone out,
// since requireAuth rejects any request from a deactivated seller — with
// no other admin able to reactivate them.
describe("assertNotSelfDeactivation", () => {
  it("throws when a caller tries to deactivate their own account", () => {
    expect(() => assertNotSelfDeactivation("seller-1", "seller-1", { is_active: false })).toThrow(
      SelfDeactivationError
    );
  });

  it("allows deactivating a different seller", () => {
    expect(() => assertNotSelfDeactivation("seller-2", "seller-1", { is_active: false })).not.toThrow();
  });

  it("allows reactivating your own account", () => {
    expect(() => assertNotSelfDeactivation("seller-1", "seller-1", { is_active: true })).not.toThrow();
  });

  it("allows updates that don't touch is_active", () => {
    expect(() => assertNotSelfDeactivation("seller-1", "seller-1", {})).not.toThrow();
  });
});
