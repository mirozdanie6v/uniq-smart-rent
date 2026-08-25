# UNIQ SMART RENT

Production-oriented TypeScript application for UNIQ Moto rental operations in Nha Trang.

Production: https://uniq-smart-rent.mirozdanie6v.workers.dev

## What is real vs. pending

The client catalog now uses a verified subset of UNIQ's public fleet data from the official website, including published prices, deposits, specifications, official photos and public contact/pickup information. Source verification date: 2026-08-25.

Live vehicle availability is **not** claimed. UNIQ's published booking flow requires manager confirmation, so the app uses `manager_confirmation` until a real calendar/database is connected.

The full public catalog currently contains 82 vehicles; this repository ships a verified representative subset and is structured so the remaining official fleet can be imported without redesigning the app.

## Verified public sources

- Catalog: https://uniqmoto.com/en/rentals/motorcycles
- Contacts: https://uniqmoto.com/en/contact
- Yamaha MT-09 SP 2023: https://uniqmoto.com/en/rentals/motorcycles/yamaha-mt-09-sp-2023
- Yamaha X-Max 300 2024: https://uniqmoto.com/en/rentals/motorcycles/yamaha-x-max-2024-76826
- Yamaha YZF-R7 2023: https://uniqmoto.com/en/rentals/motorcycles/yamaha-r7-2023
- Honda Rebel 300 2023: https://uniqmoto.com/en/rentals/motorcycles/honda-rebel-300-2023
- Detech Espero 50cc 2024: https://uniqmoto.com/en/rentals/motorcycles/detech-espero-50cc-2024

## Current product scope

- Client: date selection, verified catalog, official photos, tariff estimate, booking request, MY UNIQ session state, manager fallback.
- Team demo: current-session requests and valid booking lifecycle transitions.
- Owner demo: verified public fleet/branch counts plus session request counts; no invented revenue/utilization figures.
- Languages: RU / EN / VI / KO with browser-language detection and English fallback.
- Telegram WebApp: optional `ready`, `expand` and BackButton integration; normal web access remains fully supported.
- Cloudflare Worker API: health, business, vehicles, availability, booking creation and protected staff status updates.

## Booking lifecycle

`draft -> new -> contacted -> awaiting_confirmation -> confirmed -> vehicle_issued -> active -> return_due -> returned -> completed`

`cancelled` is supported where appropriate. Server and client use one typed status model.

## Pricing

Pricing is calculated from UNIQ's published daily / weekly / monthly rates. The estimator selects the lowest valid combination for the requested rental length. Final availability and final terms are still confirmed by a manager.

## Cloudflare architecture

Current deployment is a hybrid Worker + Static Assets application:

- Static SPA: `dist/`
- Worker entry: `src/worker.ts`
- API routes: `/api/*`
- D1: schema/migrations included but binding is optional until a real database is created
- No production booking is silently persisted to browser localStorage

Without D1, the booking API returns a deliberate manager-contact fallback rather than pretending persistence succeeded.

## Enable real D1 persistence

Create the database:

```bash
npx wrangler d1 create uniq-smart-rent-db
```

Add the returned database id to `wrangler.jsonc`:

```jsonc
"d1_databases": [
  {
    "binding": "DB",
    "database_name": "uniq-smart-rent-db",
    "database_id": "<DATABASE_ID>"
  }
]
```

Apply migrations:

```bash
npx wrangler d1 migrations apply uniq-smart-rent-db --remote
```

Set the staff API secret before enabling staff writes:

```bash
npx wrangler secret put STAFF_API_KEY
```

Then deploy through the connected Cloudflare Workers Build or manually with:

```bash
npm run deploy
```

## D1 entities

- vehicles
- vehicle_photos
- pricing
- customers
- bookings
- rentals
- service_events
- staff_notes
- activity_log

Migrations live in `migrations/` and include the verified public catalog subset.

## API

- `GET /api/health`
- `GET /api/business`
- `GET /api/vehicles`
- `GET /api/availability?vehicleId=...&from=...&to=...`
- `POST /api/bookings`
- `PATCH /api/bookings/:id/status` — requires `x-uniq-admin-key`

## Quality gates

```bash
npm run lint
npm run typecheck
npm run build
npm test
npm run test:e2e
```

CI runs these checks on GitHub, including browser E2E across the supported responsive set.

## Real data still required from UNIQ before full operational launch

### Required
- authoritative full fleet export / stable vehicle IDs
- live booking calendar and existing future bookings
- exact staff roles and authentication policy
- final pricing/discount/season rules beyond public tariffs
- cancellation, extension, damage and late-return rules
- operational handover/return workflow and required customer documents

### Recommended
- complete official photo galleries for every vehicle
- maintenance/service schedule data
- delivery-zone rules and fees, if any
- CRM/Telegram notification routing
- consent/privacy text approved by the business

### Later
- payment integration, only if UNIQ changes its current manager/handover process
- automated repeat-marketing rules
- deeper owner analytics based on real historical data
