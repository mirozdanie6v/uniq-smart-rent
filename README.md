# UNIQ SMART RENT

Production-oriented TypeScript rebuild of the previously created UNIQ rental prototype for Nha Trang.

## Scope
- Client flow: dates → catalog → vehicle → demo booking → MY UNIQ.
- Team flow: fleet statuses, returns/requests/service events, approved-data search examples.
- Owner flow: utilization, idle windows, repeat cycle, conversion concept metrics.
- RU / EN / VI / KO interface shell.
- Mobile-first safe-area / dynamic viewport handling.
- All synthetic vehicle artwork is explicitly marked **DEMO VISUAL** and is not presented as real UNIQ fleet photography.

## Source fidelity
The original self-contained source was previously delivered as `uniq-miniapp-prototype-fixed/index.html`. That prior sandbox file is no longer mounted in the current runtime, so this rebuild preserves the verified product logic and UNIQ concept materials while keeping unverified live business data labeled as demo/concept.

## Local checks
```bash
npm run typecheck
npm run build
npm test
npm run preview
python tests/e2e.py
```

## Cloudflare
The compiled site is in `dist/`. `wrangler.jsonc` deploys it as Cloudflare Static Assets. No invented backend is included; future real fleet/calendar/CRM integrations should be added behind authenticated server APIs once UNIQ data access exists.
