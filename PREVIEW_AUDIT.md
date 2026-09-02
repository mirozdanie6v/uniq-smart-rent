# UNIQ Smart Rent — role and functionality audit

Branch: `prototype/local-assets-role-refresh`

## Current main branch findings

The existing app already contains three roles in `src/app.ts`: `client`, `team`, `owner`.

- Client has: home, catalog, vehicle detail, booking request flow, MY UNIQ/session requests, contacts.
- Team has a role-specific home dashboard and can update booking statuses. Catalog/bookings/contacts are shared with the client routing.
- Owner has a role-specific home dashboard with public fleet count and session-only request metrics. It intentionally avoids fabricated revenue/utilization percentages.
- Telegram WebApp initialization is present.
- Worker API / D1 preparation exists, but the visible role dashboards are still demo/session driven until real backend bindings are connected.

## New candidate preview

`preview/full-pages.html` expands the three role surfaces without changing production:

### Client
- Home
- Full locally mirrored fleet
- Search / vehicle type / price filters
- Booking modal
- MY UNIQ request history
- Contacts

### Employee
- Operations dashboard
- Active booking queue
- Booking status editing
- Fleet operational status cycling: manager confirmation / available / reserved / service
- Shared catalog and contacts

### Owner
- Owner control center
- Real demo-session booking counts only
- Booking status pipeline
- Asset health / local media count
- Recent requests
- Shared catalog and contacts

## Official asset sync

`scripts/sync-uniq-assets.mjs` crawls only official UNIQ Moto pages, discovers vehicle detail pages, downloads every accessible vehicle image referenced by those pages, writes local files under `assets/fleet/`, and generates:

- `assets/fleet-manifest.js`
- `assets/fleet-manifest.json`
- `assets/sync-report.json`

The workflow fails rather than publishing an obviously incomplete sync if fewer than 70 vehicle pages or 50 images are obtained.

## Brand

The current public UNIQ header presents `UNIQ / NHA TRANG / RENT BIKE` as a text wordmark rather than a separate raster logo. The candidate branch therefore stores a local SVG version at `assets/brand/uniq-logo.svg`, matching the same wordmark structure, while retaining the approved black/green Smart Rent palette.

## Deployment gate

No production deployment is performed from this branch. It is intended for review first.
