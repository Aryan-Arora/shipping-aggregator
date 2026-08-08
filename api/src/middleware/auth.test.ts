import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response } from "express";

const { mockGetUser, mockSellerSingle } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockSellerSingle: vi.fn(),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({ auth: { getUser: mockGetUser } })),
}));

vi.mock("../config/supabase", () => ({
  supabase: {
    auth: { getUser: vi.fn() },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: mockSellerSingle,
    })),
  },
}));

import { requireAuth, requireAdmin } from "./auth";

function mockReqRes(headers: Record<string, string> = {}) {
  const req = { headers } as unknown as Request;
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
  const next = vi.fn();
  return { req, res, next };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("requireAuth", () => {
  it("rejects a request with no bearer token", async () => {
    const { req, res, next } = mockReqRes();
    await requireAuth(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("rejects an invalid or expired token", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: new Error("bad token") });
    const { req, res, next } = mockReqRes({ authorization: "Bearer bad-token" });
    await requireAuth(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("rejects a valid user with no seller record", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    mockSellerSingle.mockResolvedValue({ data: null, error: new Error("not found") });
    const { req, res, next } = mockReqRes({ authorization: "Bearer good" });
    await requireAuth(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it("rejects a deactivated seller — never lets a deactivated account through", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    mockSellerSingle.mockResolvedValue({
      data: { id: "s1", role: "seller", is_active: false },
      error: null,
    });
    const { req, res, next } = mockReqRes({ authorization: "Bearer good" });
    await requireAuth(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it("attaches sellerId and role, then calls next() for an active seller", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    mockSellerSingle.mockResolvedValue({
      data: { id: "seller-123", role: "seller", is_active: true },
      error: null,
    });
    const { req, res, next } = mockReqRes({ authorization: "Bearer good" });
    await requireAuth(req, res, next);
    expect(req.sellerId).toBe("seller-123");
    expect(req.role).toBe("seller");
    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("never trusts a seller_id from the request itself — only from the verified token lookup", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    mockSellerSingle.mockResolvedValue({
      data: { id: "real-seller-id", role: "seller", is_active: true },
      error: null,
    });
    const { req, res, next } = mockReqRes({ authorization: "Bearer good" });
    (req.body as unknown) = { sellerId: "attacker-supplied-id" };
    await requireAuth(req, res, next);
    expect(req.sellerId).toBe("real-seller-id");
    expect(next).toHaveBeenCalledOnce();
  });
});

describe("requireAdmin", () => {
  it("rejects a non-admin seller", () => {
    const { req, res, next } = mockReqRes();
    req.role = "seller";
    requireAdmin(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it("allows an admin through", () => {
    const { req, res, next } = mockReqRes();
    req.role = "admin";
    requireAdmin(req, res, next);
    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });
});
