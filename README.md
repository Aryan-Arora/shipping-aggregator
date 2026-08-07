# Shipping Aggregator

A NimbusPost-style multi-courier shipping aggregator — compare rates across courier partners, book the best one, and track everything from one dashboard. Built for a real logistics client.

## What it does

- Sellers add pickup locations and orders, then use **Ship Now** to compare live rates/ETAs across multiple couriers for an order's pincode + weight, and book the best one.
- Every shipment is tracked from booking → delivery, with a full event timeline.
- Failed deliveries (NDR) are auto-flagged from courier status updates.
- Courier integration is built against a mock `CourierAdapter` interface (3 mock couriers with realistic-but-fake pricing/ETA logic) so the whole platform works end-to-end before the client's real courier contracts are in place — swapping in a real courier later is a drop-in adapter, not a rewrite.

## Tech stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 16 (App Router) + TypeScript + Tailwind CSS 4 |
| Backend | Node/Express + TypeScript |
| Database & Auth | Supabase (Postgres + Auth), region: ap-south-1 |
| Design | Custom Apple-inspired design system, token-based (easy to reskin) |

## Layout

- `web/` — seller-facing Next.js dashboard
- `api/` — Express backend (auth middleware, courier adapters, rate comparison, booking, webhooks)

## Running locally

Each side has its own `.env` (`web/.env.local`, `api/.env`, not committed — see `.env.example` values in each app or ask for the Supabase keys).

```bash
cd api && npm install && npm run dev   # http://localhost:4000
cd web && npm install && npm run dev   # http://localhost:3000
```

## Current status

**Built and working:**
- Auth (Supabase email/password), with a Postgres trigger that auto-creates a seller record on signup
- Row-level security scoping every seller to their own data (admins see everything, via separate OR'd policies)
- Pickup locations & orders — full CRUD
- **Ship Now**: order → parallel rate comparison across all active couriers → book → AWB confirmation
- Shipments list (search/filter) + per-shipment event timeline
- Webhook endpoint that ingests courier status updates and auto-opens NDR cases on failed deliveries

**Not yet built** (scoped, not started):
- Full analytics dashboard (stat cards, volume charts)
- NDR management UI, COD reconciliation UI
- Admin panel (platform-wide view across all sellers)
- Production deployment (AWS Amplify + ECS Fargate)
- Real courier integration (currently mocked)

## Design system

Colors, radii, and shadows are defined once as CSS custom properties (`app/globals.css`), so the whole app's look can be re-themed by editing a handful of token values rather than hunting through every component.

---
*Generated from a Claude Code build session, 2026-08-07.*
