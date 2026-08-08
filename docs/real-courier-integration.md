# Going live with a real courier

Groundwork for swapping a mock courier for a real one is in place — the pieces below turn it on. Written for Shiprocket specifically (the adapter shipped), but the pattern is the same for any aggregator.

## What's already built

- `api/src/adapters/ShiprocketAdapter.ts` — implements the same `CourierAdapter` interface as the mocks, calling Shiprocket's real v1 external API endpoints.
- `api/src/adapters/support/aggregatorAuth.ts` — caches the login-token Shiprocket issues, refreshing it before it expires.
- `api/src/adapters/support/httpClient.ts` — retries transient (5xx/network) failures with exponential backoff; doesn't retry 4xx.
- `api/src/adapters/support/webhookVerifiers.ts` — gates inbound Shiprocket webhooks on a shared-secret header.
- `couriers` table already has a `shiprocket` row, seeded `is_active = false`.
- `api/src/adapters/index.ts` only registers `ShiprocketAdapter` when its env vars are set — an unconfigured real courier is inert, not broken.

## What you need from the client / Shiprocket account

1. A Shiprocket account (or whichever aggregator is confirmed) with API access enabled.
2. Login credentials (email + password) for the API user.
3. The seller's actual pickup pincode(s) — see the TODO below, this currently assumes one global pincode.
4. Confirmation of how Shiprocket signs/authenticates webhook calls to your endpoint (the current implementation assumes a shared-secret header; verify against their actual docs/dashboard settings).

## Steps to enable

1. Set in `api/.env` (see `.env.example` for the full list):
   ```
   SHIPROCKET_EMAIL=...
   SHIPROCKET_PASSWORD=...
   SHIPROCKET_PICKUP_PINCODE=...
   SHIPROCKET_WEBHOOK_SECRET=...
   ```
2. Restart the API server so `adapters/index.ts` picks up the new env vars and registers the adapter.
3. Register your webhook URL with Shiprocket: `POST https://your-api-domain/webhooks/shiprocket`, including whatever header/secret scheme you confirmed in step 4 above.
4. In the admin panel (`/admin/couriers`), flip Shiprocket to **Active**.
5. Test end-to-end with a real order before relying on it: compare rates, book a shipment, confirm the AWB and webhook status updates land correctly.

## Known gaps to close before this is production-ready

- **Pickup pincode is a single global env var.** Real usage needs the seller's actual chosen pickup location passed through — extend `CreateShipmentInput`/`getRates` to carry it instead of reading a static env var.
- **`createShipment` only forwards `CreateShipmentInput` as-is.** Shiprocket's `/orders/create/adhoc` needs full order line items and a pickup location ID; the mock-derived input shape is too thin. Extend it with whatever the real payload requires.
- **Webhook verification is an educated guess**, not confirmed against Shiprocket's actual mechanism — check their docs/dashboard before trusting it in production.
- **Token refresh interval (1 hour) is conservative**, not the real expiry — confirm Shiprocket's actual token lifetime and adjust.
