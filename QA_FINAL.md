# UNIQ Smart Rent — final candidate QA

Candidate branch: `prototype/local-assets-role-refresh`

## Asset sync

- 89 vehicles total
- 7 cars
- 33 motorcycles
- 49 scooters
- 405 local vehicle images
- 0 synchronization failures
- all manifest image paths are local `./assets/fleet/...`
- local UNIQ wordmark/favicon is included

## Page set

### Client
- Home
- Catalog (89 vehicles, search + type filter)
- Vehicle detail + local gallery
- Booking demo
- MY UNIQ requests
- Contacts

### Employee
- Dashboard
- Requests + status workflow
- Fleet
- Demo operational fleet state
- Handover / returns

### Owner
- Overview
- Requests
- Fleet summary
- System / backend readiness

## Automated checks — PASS

- lint
- TypeScript typecheck
- build
- 7 existing domain tests
- local asset manifest audit
- final deployable `dist` audit
- responsive browser E2E: 320×568 through 1920×1080
- Client → booking → Employee → status/fleet → handover → Owner flow
- second deployable browser E2E: phone/tablet/desktop
- no external image requests from the final browser candidate
- no horizontal overflow in tested viewports

## Deployment gate

This candidate is intentionally not deployed and not merged. Cloudflare deployment requires explicit user approval.

## Production boundary

The repository's existing Cloudflare Worker, D1 schema, migrations, booking lifecycle and domain tests remain intact. The refreshed 89-vehicle UI uses session-scoped demo requests/employee operational states until the complete synchronized catalog is promoted into the protected Worker/D1 staff flow. This avoids writing demonstration operational data into a real business database.
