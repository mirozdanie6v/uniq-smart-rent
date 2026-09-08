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

### ✅ Stage 7 — Employees and branches
Roles, permissions, two locations, vehicle transfers.

Delivered and verified:
- owner Team section with both UNIQ branches and fleet/employee counters;
- employee profiles with roles, branch assignment, active/inactive status and permissions;
- roles: owner, admin, manager and branch staff;
- permissions for bookings, CRM, fleet status, pricing, payments, finance, team and transfers;
- add/edit employee flow;
- vehicle transfer flow between North and Center with planned, in-transit and completed states;
- completed transfers update the vehicle branch in the application;
- D1 migration 0007 seeds the demonstration team and Stage 7 indexes;
- shared occupancy calendar added to the Employee panel;
- Employee navigation expanded to five sections and Owner navigation to six sections;
- navigation labels enlarged while retaining mobile usability;
- deterministic demo branch distribution for frontend fleet entries without a stored branch;
- browser acceptance verified on mobile 390×844 and desktop 1440×900;
- unit tests verified 13/13;
- production Stage 7 UI, schemaVersion 7 and D1 team API verified on uniq-smart-rent.viiversion.com.

### ✅ Stage 8 — Finance
Transactions, deposits, refunds, revenue.

Delivered and verified:
- owner Finance section with Today / 7 days / 30 days / All period filters;
- branch filter for North, Center and all locations;
- net revenue, gross payments, online, cash, pending payments, held deposits and refunds KPIs;
- additional discount, deposit-return and service-expense figures;
- unified transaction ledger with operation filter and search;
- deposit received and deposit returned workflows;
- deposits are tracked separately and excluded from revenue;
- full and partial refund workflow from a payment transaction;
- linked real payment refunds update payment and booking paid status;
- D1 payment_refunds model and booking deposit state fields;
- Stage 8 demonstration finance ledger clearly labelled DEMO;
- owner navigation expanded to seven sections with mobile-safe labels;
- D1 migration 0008 applied successfully;
- unit tests verified 14/14;
- browser acceptance verified on mobile 390×844 and desktop 1440×900;
- production schemaVersion 8, ownerFinance/refunds/deposits health flags and D1 finance API verified on uniq-smart-rent.viiversion.com.

### ✅ Stage 9 — Service
Maintenance, repairs, inspections, expenses.

Delivered and verified:
- fixed Employee → Ready for handover flow: the matching booking is created/synchronized in D1 when necessary, confirmed, and client test payment becomes available;
- client payment selector now displays seven provider brand marks: VietQR, VNPAY, MoMo, ZaloPay, SBP, YooKassa and T-Bank;
- owner Service section with maintenance, repair, inspection, cleaning and other work types;
- mileage, next-service mileage, supplier, notes, cost and inspection checklist;
- service start moves the vehicle to service state and creates an availability block;
- service completion returns the vehicle to the operational fleet and removes the service block;
- service completion updates mileage, last-service and next-service data;
- completed service cost creates a service_expense transaction in Finance;
- D1 migration 0009 extends fleet/service data and adds vehicle inspections;
- unit/domain tests verified 15/15;
- Stage 9 browser acceptance verified on mobile 390×844 and desktop 1440×900, including Ready for handover → payment and seven payment logos;
- production schemaVersion 9, serviceManagement/serviceInspections/serviceExpenses health flags and D1 service records verified on uniq-smart-rent.viiversion.com.

### 🚧 Stage 10 — Marketing
Promotions, promo codes, mailings.

### ⏳ Stage 11 — Analytics
Dashboard, charts, funnel, sources, vehicle profitability.

### ⏳ Stage 12 — AI Owner
Questions over business data + demonstration actions.

### ⏳ Stage 13 — Final end-to-end scenario
Client → QR payment → employee → handover → owner → analytics → return.

## Working rule
Only the stage marked `current` is expanded unless a dependency from a completed stage must be corrected. After QA and deployment, mark the stage completed and move `current` to the next stage.
