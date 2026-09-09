# UNIQ Smart Rent — data unification rollout

Branch: `chore/unify-data-model`

Goal: make clients, bookings and fleet use one canonical model without breaking the current demo.

## Safety rules

- `main` stays untouched until all checks pass.
- Changes are additive first; destructive cleanup is last.
- Existing browser demo data is migrated in-place where possible.
- D1 remains backward-compatible with current rows.
- UI keeps a local fallback when shared persistence or staff authorization is unavailable.
- Production deployment applies D1 migrations before deploying the Worker.

## Canonical dictionaries

### Booking statuses

`draft -> new -> contacted -> awaiting_confirmation -> confirmed -> vehicle_issued -> active -> return_due -> returned -> completed`

`cancelled` is terminal.

Legacy UI alias:

- `issued` -> `vehicle_issued`

### Fleet statuses

- `manager_confirmation`
- `available`
- `reserved`
- `service`

Legacy UI aliases:

- `manager` -> `manager_confirmation`
- `ready` -> `available`
- `hold` -> `reserved`

## Current status

### Phase 1 — compatibility foundation — COMPLETE

- Canonical booking and fleet status dictionaries added.
- Legacy browser values migrate on read.
- Public fleet count aligned from stale 82 to synced 89.
- Normalized customer contact key added in D1.
- Repeated bookings with the same normalized contact reuse the same `customer_id`.
- D1 schema compatibility bootstrap upgraded to version 4.
- Existing records remain valid; no destructive migration is used.

### Phase 2 — shared D1 adapter — COMPLETE FOR PUBLIC WRITE / API READY FOR STAFF

- Client booking POST works against `/api/bookings` for any published fleet vehicle.
- HTTPS UI writes through to D1 when persistence is configured.
- Static/local preview keeps a local fallback and does not issue false API writes.
- Authenticated staff endpoints exist for bookings, customers and fleet state.
- Booking and fleet status PATCH endpoints use canonical statuses.
- Staff cross-device hydration remains intentionally gated by staff authorization; no admin credential is exposed in the public Mini App.

### Phase 3 — fleet source unification — COMPLETE

- Worker reads the same `assets/fleet-manifest.json` used by the UI.
- `/api/vehicles` exposes the same 89-unit fleet.
- Bookings can reference vehicles outside the old five-item TypeScript subset.
- Authenticated `/api/admin/sync-fleet` can populate/update all 89 D1 vehicle rows.
- D1 pricing sync stores day/week/month and `deposit_vnd` from the manifest.
- The old five-item seed remains only as backward-compatible bootstrap data and is no longer the authoritative API catalogue.

### Phase 4 — panel consistency — COMPLETE FOR CURRENT DEMO, SERVER CUTOVER AUTH-GATED

- Client, employee and owner roles use one canonical browser data model.
- Old session demo data is migrated to the new local store.
- Employee booking status changes and fleet status changes are reflected in owner/client views in the same app state.
- Owner dashboard derives customer summary from the same booking records.
- Rental estimate calculation now follows the same package rules in UI and backend.
- Server-side staff reads/writes are ready, but full cross-device staff synchronization must only be enabled after a real staff authentication/session flow is configured.

### Phase 5 — cleanup — DEFERRED BY DESIGN

- Do not remove legacy aliases, five-item bootstrap seed, or local fallback until production D1 sync and staff authentication have been proven.
- Do not merge to `main` until lint, typecheck, build, unit tests, Worker dry-run and browser E2E are all green on the final commit.

## Production rollout order

1. Run the complete CI suite on this branch.
2. Merge only after all checks pass.
3. Production deploy runs `wrangler d1 migrations apply uniq-smart-rent-db --remote` before `wrangler deploy`.
4. Verify `/api/health` reports schema version 4.
5. Run authenticated `POST /api/admin/sync-fleet` and verify 89 D1 fleet records.
6. Verify one client booking appears with one `customer_id` and the expected `vehicle_id`/pricing.
7. Verify protected staff booking/fleet reads before enabling cross-device staff hydration.
