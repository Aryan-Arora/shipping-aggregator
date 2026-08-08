import { Request } from "express";

// Only real couriers get an entry here — mock couriers have nothing to
// verify, and an unlisted courier code means webhooks.ts skips verification
// (matching today's mock-only behavior) rather than rejecting everything.
//
// Shiprocket doesn't sign webhook payloads with HMAC; it expects the
// registered webhook URL to include a shared secret, checked here via a
// header instead. Confirm the exact mechanism against the real account
// before enabling — this is a reasonable placeholder, not a confirmed spec.
export const webhookVerifiers: Record<string, (req: Request) => boolean> = {
  shiprocket: (req: Request) => {
    const expected = process.env.SHIPROCKET_WEBHOOK_SECRET;
    if (!expected) return false;
    return req.headers["x-api-key"] === expected;
  },
};
