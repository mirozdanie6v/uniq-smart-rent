# UNIQ Smart Rent — Development Roadmap

This file is the source of truth for the staged implementation plan. Before starting a new stage, compare the current work against this roadmap.

## Status legend
- ✅ completed
- 🚧 current
- ⏳ planned

## Stages

### ✅ Stage 0 — Architecture
React + TypeScript + Vite, routing, store, i18n, shared UI kit.

### ✅ Stage 1 — Existing application migration
Migrate the current Client + Employee + Owner application without changing product functionality.

### ✅ Stage 2 — Data model
Vehicle, Booking, Customer, Payment, Employee, Branch, ServiceRecord, Promotion, Transaction.

### ✅ Stage 3 — Fleet
Add / edit / archive vehicles, pricing, photos, branches and statuses.

### ✅ Stage 4 — Booking
Calendar, availability, extensions, handover and return.

### ✅ Stage 5 — Payments
VietQR / VNPAY / MoMo / ZaloPay / SBP / YooKassa / T-Bank + DEMO QR.

### ✅ Stage 6 — CRM
Customers, customer history, search and segments.

Delivered and verified:
- owner Customers/CRM section;
- customer list with search and filtering;
- New, Repeat, VIP and Inactive segments;
- customer card with contacts, language/country, rental count, lifetime value and notes;
- customer history with bookings, payment state and rental lifecycle;
- new Mini App bookings represented in CRM data;
- realistic multilingual demonstration customer dataset;
- browser acceptance verified on mobile 390×844 and desktop 1440×900;
- production deployment verified on uniq-smart-rent.viiversion.com.

### 🚧 Stage 7 — Employees and branches
Roles, permissions, two locations, vehicle transfers.

### ⏳ Stage 8 — Finance
Transactions, deposits, refunds, revenue.

### ⏳ Stage 9 — Service
Maintenance, repairs, inspections, expenses.

### ⏳ Stage 10 — Marketing
Promotions, promo codes, mailings.

### ⏳ Stage 11 — Analytics
Dashboard, charts, funnel, sources, vehicle profitability.

### ⏳ Stage 12 — AI Owner
Questions over business data + demonstration actions.

### ⏳ Stage 13 — Final end-to-end scenario
Client → QR payment → employee → handover → owner → analytics → return.

## Working rule
Only the stage marked `current` is expanded unless a dependency from a completed stage must be corrected. After QA and deployment, mark the stage completed and move `current` to the next stage.
