# UNIQ Smart Rent — Full Fleet Brand Refresh

Branch: `prototype/full-fleet-brand-refresh`

Status: prepared for review only. Do not deploy until explicit approval.

## Prototype scope
- Brand direction matched to the current UNIQ Moto public site: dark base, white UNIQ wordmark treatment and green accent.
- Fleet source: https://uniqmoto.com/ru/rentals/motorcycles and https://uniqmoto.com/ru/rentals/cars
- Verified public fleet on 2026-09-02: 82 motorcycles/scooters + 7 cars = 89 units.
- Daily rental prices and deposits use the published UNIQ Moto values.
- Vehicle photos are restricted to UNIQ Moto public assets / its public Supabase vehicle storage; no stock-image substitutions.
- Prototype includes responsive catalog filters and a non-submitting demo booking modal.

## Approval gate
After approval, integrate the reviewed HTML/data into the production source, run repository checks, then deploy with Wrangler/Cloudflare. Production deployment remains intentionally untouched in this branch.
