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
- client payment selector displays seven provider brand marks: VietQR, VNPAY, MoMo, ZaloPay, SBP, YooKassa and T-Bank;
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

### ✅ Stage 10 — Marketing
Promotions, promo codes, mailings.

Delivered and verified:
- fixed glued payment label/value rendering in request cards with flex layout, gap and mobile wrapping;
- owner Marketing section with promotions, promo codes and campaigns;
- percent and fixed-VND discounts;
- audience targeting by CRM segment: all, new, repeat, VIP and inactive;
- optional vehicle-kind and branch targeting plus usage limits;
- campaign channels Telegram, Zalo, Email and SMS as DEMO integrations;
- DEMO campaign delivery updates recipients, opens, clicks, conversions and attributed revenue;
- D1 marketing_campaigns and marketing_campaign_events plus promotion targeting fields;
- seeded demonstration campaigns and promotions for presentation;
- owner navigation expanded to nine sections with mobile-safe layout;
- D1 migration 0010_stage10_marketing.sql applied successfully;
- unit/domain tests verified 16/16;
- Stage 10 browser acceptance verified on mobile 390×844 and desktop 1440×900, including payment-text spacing and no horizontal overflow;
- production schemaVersion 10, marketingCampaigns/promotionsMarketing/marketingSegments health flags and D1 marketing API verified on uniq-smart-rent.viiversion.com.

### ✅ Stage 11 — Analytics
Dashboard, charts, funnel, sources, vehicle profitability.

Delivered and verified:
- dedicated owner Analytics section;
- Today / 7 days / 30 days and branch filters;
- revenue, bookings, average check, utilization, repeat share, new customers and payment conversion;
- revenue/bookings trend without a chart library;
- funnel: views → vehicle opens → booking start → payment → paid;
- source comparison for Telegram Mini App, website, office, Google, Instagram, partners and QR;
- North and Center branch comparison;
- vehicle profitability by revenue, rentals, utilization and idle days;
- D1 analytics funnel telemetry and realistic DEMO bookings in multiple statuses;
- business requests visible to Employee/Owner and hidden from Client personal cabinet;
- mobile and desktop browser acceptance;
- production Analytics API and Stage 11 UI verified.

### 🚧 Stage 12 — AI Owner
Questions over business data + demonstration actions.

Operational corrections completed before AI implementation:
- owner can add new branches dynamically;
- employees, vehicles and transfers support dynamic branch IDs;
- full public 89-vehicle catalog is synchronized into the operational D1 layer;
- client can extend an eligible booking/rental with collision validation;
- extension recalculates booking total and creates the exact additional balance;
- client can pay the remaining balance after a prepayment;
- payment intents supersede stale pending intents and confirmation is idempotent;
- overpayment is blocked and closed bookings cannot receive new payments/extensions;
- owner Analytics was regression-protected during the operational merge;
- on mobile all ten owner sections are now visible in a fixed 5×2 navigation grid, so Analytics is never hidden behind horizontal scrolling;
- merged Stage 11 + operational Stage 12 regression passed on desktop and mobile before production deployment.

AI Owner itself remains current and is not marked complete until questions over business data and demonstration actions are implemented and verified.

### ⏳ Stage 13 — Final end-to-end scenario
Client → QR payment → employee → handover → owner → analytics → return.

## Working rule
Only the stage marked `current` is expanded unless a dependency from a completed stage must be corrected. After QA and deployment, mark the stage completed and move `current` to the next stage.
