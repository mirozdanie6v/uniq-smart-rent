# AUTO SALE — YDB/state/outbox audit and zero-downtime normalization plan

## Implementation status — 2026-09-28

### Phase 3 — COMPLETE

Normalized reads are enabled on Yandex staging with verified legacy fallback.

Runtime configuration:
- `AUTO_SALE_YDB_DUAL_WRITE=true`;
- `AUTO_SALE_YDB_READ_MODE=normalized`.

Read path:
1. one YDB multi-result query reads the legacy compatibility row, migration meta and all normalized tables in one request;
2. normalized rows are reconstructed into the exact legacy API response shape;
3. empty legacy note buckets are preserved for response compatibility;
4. source revision must match normalized `source_revision`;
5. canonical legacy and normalized hashes must match;
6. only then is the normalized snapshot returned;
7. any query error, revision mismatch or parity mismatch falls back to the legacy blob.

Cold-start hardening completed during this phase:
- runtime containers no longer execute DDL;
- schema creation/migrations run once in the deploy workflow via `prepare:ydb-runtime`;
- normalized reader does not repeat schema initialization;
- legacy mode does not initialize the normalized reader at all.

The first Phase 3 live rollout was rejected by the deployment gate because the original normalized read path made too many YDB round trips and could hit the 60s container timeout. Staging was returned to legacy reads, the read path was redesigned, and the optimized rollout was repeated successfully.

Final live verification:
- quality gate: 213 passed, 0 failed;
- deploy-time schema preparation: passed;
- health: `ydbStateReadMode=normalized`;
- protected read diagnostic: `source=normalized`, `fallback=false`, `shadowVerified=true`;
- temporary lead create: revision 2466, parity 100%;
- temporary lead delete: revision 2467, parity 100%;
- final hash returned to the baseline canonical hash;
- final counts: leads 7, quotes 7, orders 3, payments 8, notes 2, team 3, catalog 149, Telegram bindings 8.

The legacy blob remains maintained by dual-write and is the immediate read fallback. The frontend contract has not changed.

Next step: Phase 4 entity mutation API with per-aggregate optimistic locking. Keep the compatibility `PUT /api/auto-sale/state` during the rollback window, then move frontend actions from browser-first full-state persistence to server-primary entity commands.

### Phase 2 — COMPLETE

Transactional dual-write is enabled on Yandex staging behind `AUTO_SALE_YDB_DUAL_WRITE=true`.

Current write path:
1. read legacy `auto_sale_state` inside a serializable YDB transaction;
2. enforce legacy optimistic revision;
3. write the new legacy blob;
4. if shadow `source_revision` is stale, catch it up inside the same transaction;
5. compute entity-level normalized diff;
6. apply only changed normalized rows/deletes;
7. enqueue notification outbox rows;
8. commit once.

This means legacy state, normalized shadow and notification intents share one transaction boundary.

Live verification:
- quality gate: 208 passed, 0 failed;
- health: `ydbDomainDualWrite = enabled`;
- temporary lead create: revision 2459;
- normalized diff on create: leads +1 only;
- legacy/normalized parity after create: 100%;
- temporary lead delete: revision 2460;
- normalized diff on delete: leads -1 only;
- legacy/normalized parity after cleanup: 100%;
- final legacy hash restored to the Phase 1 canonical hash;
- catalog remained 149 rows;
- no Telegram notification was sent during the verification.

A permanent deploy gate now runs `scripts/test-ydb-dual-write-live.mjs` after every Yandex staging deployment. Deployment is not considered successful unless live create/delete parity succeeds.

Important:
- legacy `GET /api/auto-sale/state` is still the read source;
- global revision still exists for the compatibility endpoint;
- normalized tables are now continuously maintained, but the frontend has not been switched to entity APIs yet;
- rollback remains immediate: disable `AUTO_SALE_YDB_DUAL_WRITE` and legacy behavior continues unchanged.

Next step: Phase 3 normalized shadow reads / parity-read mode, while keeping the public response contract and a feature-flag fallback to legacy reads.

### Phase 1 — COMPLETE

Live backfill result:
- source revision: `2458`;
- schema version: `1`;
- migration status: `backfilled`;
- canonical legacy hash = normalized hash;
- ID parity: passed;
- diff paths: none;
- source revision stayed stable during copy and parity verification.

Backfilled shadow counts:
- leads: 7;
- quotes: 7;
- orders: 3;
- payments: 8;
- notes: 2;
- team: 3;
- catalog: 149;
- Telegram bindings: 8.

A first strict parity attempt identified only legacy empty note buckets such as `notes[leadId] = []`. Canonical parity now treats an absent empty note bucket and an explicit empty array as equivalent; non-empty notes still compare field-for-field. After that normalization, parity is 100%.

Important:
- normalized tables are now a shadow copy only;
- `auto_sale_state` remains the production source of truth;
- no production endpoint has been switched;
- no dual-write is active yet;
- no legacy data was deleted or modified by the migration.

Next step: Phase 2 transactional dual-write behind a feature flag, with the legacy blob still serving reads and remaining the immediate rollback path.

### Phase 0 — COMPLETE

Implemented:
- normalized YDB schema v1;
- idempotent schema version table `auto_sale_schema_meta`;
- `server/ydb-domain-store.mjs`;
- legacy → normalized → legacy mapping/parity helpers;
- explicit `sort_order` preservation for collection/payment/note order;
- Telegram identity extraction model;
- schema preparation script;
- parity/round-trip tests.

Live YDB preparation result:
- schema version: `1`;
- normalized domain tables created successfully;
- all normalized domain tables are currently empty;
- no backfill has been executed;
- `auto_sale_state` remains the production source of truth;
- current outbox and all runtime endpoints remain unchanged.

Quality gate:
- lint: passed;
- typecheck: passed;
- build: passed;
- tests: 202 passed, 0 failed.

Next step: Phase 1 idempotent backfill + live parity report. Do not change read/write source yet.

Date: 2026-09-28
Branch: `prototype/auto-sale-usa`

## Current implementation

### YDB
`server/ydb-state.mjs` currently creates only:
- `auto_sale_state`: one row, `id=1`, global `revision`, whole application payload as JSON;
- `auto_sale_notification_outbox`: durable Telegram notification queue.

The state payload contains `leads`, `quotes`, `orders`, `notes`, `team`, and `catalog`. Every state mutation reads the whole row, validates the whole submitted snapshot, and replaces the whole row under one global optimistic revision.

### Browser sync
`public/auto-sale-bootstrap.mjs` patches `Storage.prototype.setItem`. Any tracked localStorage mutation schedules a full `PUT /api/auto-sale/state`. The payload always includes all domain collections. Conflicts are handled by client-side record rebase and retry.

`public/auto-sale-app-v3.mjs` uses `saveAll()` after domain actions. The server is therefore not yet the primary mutation API: browser state is mutated first, then synchronized.

### Telegram identity
`/api/auto-sale/telegram/link-client` and `/api/auto-sale/telegram/register-manager` both load the whole state and call `replaceState`, so a Telegram identity change increments the same global revision and can conflict with unrelated CRM/catalog writes.

### Outbox
The outbox is structurally correct:
- state + notification intents are committed in the same serializable YDB transaction;
- statuses: `pending -> processing -> sent/retry/dead`;
- retry backoff and expired-processing reclaim exist;
- request response is not blocked on Telegram delivery.

Weak points:
- event IDs depend on the global state revision;
- processing lease has no lease token/owner, so a stale worker can still mark a row after it has been reclaimed;
- sent/dead rows have no retention policy;
- notification generation is derived by diffing whole previous/next state;
- the Cloudflare inbound webhook relay currently has no Telegram `secret_token` validation.

## Main finding

The core architectural problem is the global mutable state row, not YDB itself and not the outbox pattern.

The current system creates unnecessary contention because unrelated operations share one revision:
- lead update vs catalog edit;
- Telegram binding vs quote save;
- order stage vs team update;
- different leads edited by different users.

Client-side merge/retry logic and save-fix modules are compensating for this design.

## Existing reusable work

The repository already contains a normalized D1/Postgres model:
- leads;
- quotes;
- orders;
- payments;
- notes;
- team;
- state meta.

Relevant files:
- `src/auto-sale/storage.ts`
- `migrations/0005_auto_sale_crm.sql`
- `migrations/0009_auto_sale_team.sql`
- `yandex/postgres/001_init.sql`

This model should be used as the starting point, not copied verbatim. It lacks catalog, Telegram bindings, normalized outbox metadata, and robust delete semantics.

## Target YDB schema

### auto_sale_leads
Primary key: `id`
Columns: `row_version`, `status`, `manager`, `source`, `client_created`, `payload`, `updated_at`.

### auto_sale_quotes
Primary key: `id`
Columns: `row_version`, `lead_id`, `status`, `quote_version`, `payload`, `updated_at`.

### auto_sale_orders
Primary key: `id`
Columns: `row_version`, `lead_id`, `stage`, `manager`, `risk_type`, `payload`, `updated_at`.

### auto_sale_payments
Primary key: `(order_id,id)`
Columns: `amount`, `payment_date`, `method`, `payload`, `created_at`.

### auto_sale_notes
Primary key: `(lead_id,id)`
Columns: `text`, `payload`, `created_at`.

### auto_sale_team
Primary key: `id`
Columns: `row_version`, `name`, `role`, `active`, `payload`, `updated_at`.

### auto_sale_catalog
Primary key: `id`
Columns: `row_version`, `origin`, `active`, `auction_date`, `payload`, `updated_at`.

### auto_sale_telegram_bindings
Primary key: `(subject_type,subject_id)`
Columns: `telegram_user_id`, `username`, `first_name`, `last_name`, `linked_at`, `updated_at`.

### auto_sale_notification_outbox
Keep the current table and evolve it additively with:
`event_type`, `aggregate_type`, `aggregate_id`, `target`, `chat_id`, `dedupe_key`, `lease_id`, `lease_until`.

### auto_sale_state_meta
Temporary compatibility metadata only:
- `compat_revision`;
- `schema_version`;
- migration/backfill status.

The global revision must not remain the primary concurrency mechanism after cutover.

## Zero-downtime rollout

### Phase 0 — additive schema
No runtime behavior change.
1. Add normalized tables with `CREATE TABLE IF NOT EXISTS`.
2. Add an idempotent schema migration/version mechanism.
3. Add `server/ydb-domain-store.mjs`.
4. Keep current blob state and outbox as the production source of truth.

Rollback: deploy previous revision. No data migration is destructive.

### Phase 1 — idempotent backfill
1. Read `auto_sale_state(id=1)`.
2. Backfill leads/quotes/orders/payments/notes/team/catalog.
3. Extract Telegram identities into `auto_sale_telegram_bindings`.
4. Preserve payload JSON exactly.
5. Store source global revision used by the backfill.
6. Build a parity checker that reconstructs a compatibility snapshot from normalized tables and compares IDs/counts/canonical hashes against the blob.

Do not delete or stop updating the blob.

Rollback: ignore normalized tables.

### Phase 2 — shadow + transactional dual-write
Keep the current browser/API unchanged.

Change the legacy `PUT /api/auto-sale/state` implementation so one YDB transaction:
1. validates the same business rules;
2. computes entity-level differences;
3. updates only changed normalized rows;
4. updates the compatibility blob;
5. inserts outbox records;
6. increments `compat_revision`.

The blob remains the read source initially.

Purpose: prove normalized data stays in exact parity under real traffic without changing UX.

Rollback: feature flag back to blob-only writes.

### Phase 3 — normalized reads
Switch `GET /api/auto-sale/state` to assemble the same legacy response shape from normalized tables.

Keep:
- the same JSON contract;
- the compatibility revision;
- a feature-flag fallback to blob reads.

Run shadow comparisons for every read during the first rollout.

Rollback: switch read-source flag back to blob.

### Phase 4 — entity mutation API
Introduce server-primary commands with per-row optimistic locking:
- `POST /api/auto-sale/leads`
- `PATCH /api/auto-sale/leads/:id`
- `POST /api/auto-sale/leads/:id/notes`
- `POST /api/auto-sale/quotes`
- `PATCH /api/auto-sale/quotes/:id`
- `POST /api/auto-sale/orders`
- `PATCH /api/auto-sale/orders/:id`
- `POST /api/auto-sale/orders/:id/payments`
- `POST/PATCH/DELETE /api/auto-sale/catalog/:id`
- `PATCH /api/auto-sale/team/:id`
- Telegram link/register endpoints update only `auto_sale_telegram_bindings`.

Each command transaction:
1. reads only required rows;
2. validates transition/business rules;
3. compares `row_version` for changed aggregate;
4. writes affected rows;
5. inserts notification outbox events in the same transaction;
6. optionally keeps the compatibility blob updated during the rollback window.

Notification templates should be refactored from whole-state diffing into command/event builders.

Rollback: old full-state endpoint remains available during the compatibility window.

### Phase 5 — frontend cutover
Replace browser-first whole-state synchronization:
- remove `Storage.prototype.setItem` interception;
- remove automatic full-state `PUT`;
- remove `saveAll()` as a persistence mechanism;
- localStorage becomes cache only;
- form actions await the entity API and update the local row from the server response;
- replace global client rebase with per-entity 409 handling.

This removes the current class of global revision conflicts and save/re-render loops.

### Phase 6 — retire global state writes
After the new UI is stable and legacy `PUT /state` traffic has stopped:
1. disable public legacy state writes;
2. stop dual-writing the compatibility blob;
3. keep `GET /state` only as a temporary compatibility snapshot if still needed;
4. archive/export the final blob snapshot;
5. later remove the blob table only after a retention period.

## Outbox hardening during the migration

1. Keep entity mutation + outbox enqueue atomic.
2. Replace revision-derived event IDs with operation-derived deterministic IDs:
   `<operationId>:<event>:<target>:<chatId>`.
3. Claim with a random `lease_id` and `lease_until`.
4. Mark sent/retry only when `id + lease_id + processing` still match.
5. Add retention/cleanup for old `sent` rows.
6. Add dead-letter retry tooling.
7. Keep Cloudflare as the stateless Telegram transport adapter.
8. Configure Telegram webhook `secret_token` and verify it at the relay/upstream boundary.

## Security prerequisite for real operation

Current Yandex demo uses `AUTO_SALE_PUBLIC_DEMO_WRITE`. With that flag enabled, the whole state read/write endpoint is public and CORS is `*`. The role switch is UI state, not staff authorization.

Before real client/manager production use:
- authenticate staff;
- authorize entity endpoints by role;
- expose client-scoped data only to the authenticated Telegram user;
- disable public whole-state writes;
- do not send the full CRM state to client sessions.

This should be done during Phase 4/5, not postponed until after the normalized cutover.

## Acceptance gates

Do not remove the compatibility blob until all are green:
1. backfill parity = 100%;
2. shadow dual-write parity = 100%;
3. no lost/deleted entities in migration tests;
4. concurrent edits to different leads do not conflict;
5. concurrent edits to the same lead produce a per-row conflict;
6. Telegram binding no longer increments an unrelated lead/catalog revision;
7. outbox event and business mutation commit atomically;
8. notification retries survive container restarts;
9. stale outbox worker cannot overwrite a newer lease;
10. complete lifecycle E2E passes on normalized API;
11. legacy state endpoint rollback works during the compatibility window;
12. no legacy full-state writes observed before final retirement.
