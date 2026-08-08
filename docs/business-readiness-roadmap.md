# Business-Readiness Roadmap

This is the plan we follow from here on. The original 11-tier build plan (Tiers 1–11) is done — seller-side platform, admin panel, and real-courier-adapter groundwork are all built and live-verified. This document picks up where that left off: closing the gap between "a working demo" and "something a real logistics business can run on."

Tiers continue the existing numbering. Each tier should ship as its own reviewable chunk, same as before — don't blend them.

## Status snapshot (as of this doc)

| Tier | What | Status |
|---|---|---|
| 1–8 | Foundation → Dashboard/NDR/COD UI | ✅ Done, live-verified |
| 10 | Admin panel | ✅ Done, live-verified |
| 11 | Real courier adapter groundwork | ✅ Done — inert until real credentials exist |
| 12 | Correctness-critical backend jobs | ⬜ This doc |
| 13 | Production hardening | ⬜ This doc |
| 14 | List-page & admin polish | ⬜ This doc |
| 15 | AWS deployment | ⬜ This doc — intentionally last |
| 16 | Real courier integration close-out | ⬜ Blocked on client credentials |

---

## Tier 12 — Correctness-critical backend jobs

These three were named in the original spec's `jobs/` directory and never built. Unlike the polish items below, these affect whether the data is actually *right*, not just how it looks.

1. **`jobs/trackingReconciliation.ts`** — webhook fallback poller. For any shipment with no status update in N hours, call the courier adapter's `trackShipment()` directly. Without this, a silently-dropped webhook means a shipment's status is permanently stale with no recovery path.
2. **`jobs/codReconciliation.ts`** — nightly job to populate/update `cod_remittances`. Today that table has no write path at all outside direct DB access — the admin COD page is read-only. Needs:
   - A way to record an actual remittance (manual admin entry at minimum; real courier API/report ingestion later)
   - The nightly match-and-flag logic the original spec described
3. **`jobs/retryQueue.ts`** — durable retry queue for failed courier calls. What exists today (Tier 11) is inline exponential backoff per HTTP call — if all retries fail, the operation is just lost. This tier should add a persisted queue (a `failed_operations` table is enough — doesn't need a message broker) so a booking or status update that failed can be retried later instead of disappearing.

**Verification:** simulate a stale shipment and confirm the reconciliation job catches it; manually enter a COD remittance via the new admin path and confirm the reconciliation numbers update; force a courier call to fail and confirm it lands in the retry queue instead of erroring silently.

## Tier 13 — Production hardening

Not in the original spec, but implied by "a business runs on this":

1. **Automated tests** — start with the parts most likely to silently break: `rateComparisonService`, `bookingService`, the auth middleware's seller-scoping, and the admin self-deactivation guard (the bug we caught live last session — a regression here is exactly the kind of thing a test should catch before it does).
2. **Rate limiting** — the original backend plan explicitly calls for this on the Express service; never implemented. No protection against abuse today.
3. **Password reset flow** — only email/password login+signup exist. No recovery path if a seller forgets their password.
4. **Email deliverability** — Supabase's default email confirmation has only been tested by manually confirming test users via SQL. Needs a real test against actual email delivery before launch.
5. **CI pipeline** — typecheck + build (and tests, once they exist) running on every push, not just manually.
6. **Error tracking & structured logging** — right now failures are only visible via `console.log` in a local terminal. Needs something that survives a deployed environment.

## Tier 14 — List-page & admin polish

Lower-stakes than Tiers 12–13, but named directly in the spec's design notes ("every list page needs search, status filter, date range filter, pagination"):

1. Bring Orders and Pickup Locations up to the same filter/pagination standard as Shipments (which already has search + status filter).
2. Add date-range filtering to Shipments and the admin global shipments view.
3. Admin courier "rate card" view (spec named this explicitly; only performance stats got built).
4. Admin NDR action capability — currently read-only oversight; decide if admins should be able to act on a seller's NDR case directly, or if that should stay seller-only by design.

## Tier 15 — AWS Deployment

Intentionally last, per your call last session — one clean deploy once everything above is solid, rather than redeploying repeatedly as more lands on top.

1. Frontend → AWS Amplify
2. Backend → ECS Fargate (or EC2 short-term, per original spec's flexibility)
3. Secrets → AWS Secrets Manager, replacing local `.env` files
4. Custom domain + SSL
5. Staging vs. production environment separation (doesn't exist today — there's only ever been one Supabase project and one local setup)

## Tier 16 — Real courier integration close-out

Blocked on you getting real Shiprocket (or whichever aggregator) credentials. Once available, close the gaps already documented in [`real-courier-integration.md`](./real-courier-integration.md):
- Pickup pincode currently a single global env var, not per-seller
- `createShipment`'s payload shape needs extending for Shiprocket's real order-creation API
- Webhook signature verification mechanism is an educated guess, unconfirmed against the real account

---

## Suggested order

**12 → 13 → 14 → 15**, with **16 running whenever credentials arrive** (doesn't block anything else). 12 and 13 matter most because they're correctness/safety, not appearance — worth doing before polish or deployment locks in the current gaps.
