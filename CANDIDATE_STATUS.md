# UNIQ Smart Rent — local-assets role refresh

Branch: `prototype/local-assets-role-refresh`

## Deployment gate

No Cloudflare deployment is performed from this branch. Deployment is intentionally held until explicit approval.

## Candidate UI

The deployable root build uses the approved black/green visual direction and local UNIQ assets.

Client:
- Home
- Full fleet catalog
- Vehicle detail / local gallery
- Demo booking request
- MY UNIQ requests
- Contacts

Employee:
- Operations dashboard
- Requests and status changes
- Full fleet list
- Demo operational fleet states
- Handover / return queue

Owner:
- Overview derived from current demo session
- Requests
- Fleet summary
- System / backend readiness

## Data and assets

- Official source: https://uniqmoto.com/ru
- Fleet source pages are saved in every manifest entry.
- Vehicle photos are downloaded into `assets/fleet/` and referenced by local web paths.
- The header wordmark on the current UNIQ site is text-based (`UNIQ / Nha Trang / Rent Bike`); a local SVG version is stored in the project so the candidate has no logo-network dependency.
- Live availability is never invented. Manager confirmation remains the public rule.

## Backend boundary

The existing Cloudflare Worker/D1 source, migrations and domain tests remain in the repository and continue to build.

The refreshed 89-vehicle UI is a presentation/demo candidate. Its employee fleet-state and cross-role request flow are session-scoped so the prototype cannot write invented operational data into a real business database.

Before a production business rollout (as distinct from a demo/prototype deployment), the full synchronized fleet should be promoted into the Worker/D1 catalog and employee/owner authentication should be connected to the existing protected staff API.

## QA gates

The candidate CI checks:
- existing lint, TypeScript, build and domain tests;
- exactly 89 synchronized vehicle entries;
- valid published daily prices;
- local file existence for every synchronized image;
- zero asset-sync failures;
- deployable `dist` contains fleet manifest, photos, app and local logo;
- browser flow at phone/tablet/desktop sizes;
- client booking -> employee status/fleet controls -> owner dashboard;
- no external image requests in the final browser candidate.
