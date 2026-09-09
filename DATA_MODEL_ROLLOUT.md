# UNIQ Smart Rent — data unification rollout

Branch: `chore/unify-data-model`

Goal: make clients, bookings and fleet use one canonical model without breaking the current demo.

## Safety rules

- `main` stays untouched until all checks pass.
- Changes are additive first; destructive cleanup is last.
- Existing browser demo data must be migrated in-place where possible.
- D1 remains backward-compatible with current rows.
- UI keeps a local fallback until shared API reads are ready and authenticated.

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

## Phases

### Phase 1 — compatibility foundation

- Canonicalize booking and fleet status dictionaries.
- Migrate legacy browser values on read.
- Change public fleet count from stale 82 to synced 89.
- Add normalized customer contact key in D1 and reuse existing customer rows.
- Add tests for status aliases and the current fleet count.

No removal of existing UI storage in this phase.

### Phase 2 — shared D1 read/write adapter

- Persist every client booking to `/api/bookings` when D1 is available.
- Add authenticated staff reads for bookings/customers/fleet states.
- Keep local demo fallback when persistence/auth is unavailable.

### Phase 3 — fleet source unification

- Generate D1 fleet rows from `assets/fleet-manifest.json` (89 units).
- Make vehicle ids/pricing/statuses match the manifest exactly.
- Remove the old five-item server seed once the full fleet seed is proven.

### Phase 4 — panel cutover

- Client, employee and owner panels read the same shared entities.
- Customer history is derived by `customer_id`.
- Booking status updates and fleet status updates are persisted once and reflected everywhere.

### Phase 5 — cleanup

- Remove obsolete duplicate demo stores and legacy aliases only after migration coverage proves they are unused.
- Run build, typecheck, unit/e2e tests and deployment smoke checks before merging.
