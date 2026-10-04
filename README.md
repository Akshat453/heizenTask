# Fernleaf Kitchen

Operations platform for a corporate-catering kitchen: companies and their employees, a priced menu, employee orders with cut-off, Kitchen preparation, Dispatch grouping, Driver delivery with optional photo proof, invoicing, and role dashboards.

## Contents

- [Architecture](#architecture)
- [Local setup](#local-setup)
- [Environment variables](#environment-variables)
- [Reviewer accounts](#reviewer-accounts)
- [Domain rules](#domain-rules)
- [API conventions](#api-conventions)
- [Frontend](#frontend)
- [Testing](#testing)
- [Seed data](#seed-data)
- [Scope and trade-offs](#scope-and-trade-offs)

## Architecture

```text
Browser ──► Next.js (App Router, client pages) ──HTTP/JSON──► NestJS API ──► Prisma ──► PostgreSQL (Neon)
```

- **NestJS (`backend/`)** owns all business rules: pricing, menu orderability, cut-off, Kitchen timing, Dispatch grouping, delivery, billing and dashboard metrics. It runs as feature modules (orders, kitchen, dispatch, driver, billing, …) on Prisma 7 with the `@prisma/adapter-pg` driver adapter.
- **Next.js (`frontend/`)** is a presentation layer that calls the API directly with `fetch` through one client (`src/lib/api-client.ts`). There is no BFF, no Server Action business logic, and no Prisma in the frontend.
- **Authentication:** a JWT in an HttpOnly cookie (`heizen_access_token`). Global guards run `JwtAuthGuard` → `PermissionsGuard`, so an unauthenticated request gets 401 before a permission check can return 403. Endpoints declare `@RequirePermissions(...)`. Role names are used by the frontend for navigation only; the backend authorizes by permission.
- **Concurrency safety** comes from PostgreSQL: row locks (`FOR UPDATE`), conditional updates for state transitions, unique and partial-unique indexes, and transaction-scoped advisory locks. The lock order is documented on `DeliveryGroupingService`.

```text
StaffUser ─ Role ─ Permission          (staff who operate the app)
Company ─┬─ Employee (orders are placed for employees)
         ├─ CompanyAddress / WorkingDay / Holiday / hidden menu items
         └─ PriceTier (optional; otherwise the active default tier)
Order ─ OrderLine ─ OrderCombination ─ OrderCombinationOption   (price/name snapshots)
  │                        └─ PrepUnit (one per combination, created at confirmation)
  ├─ OrderEvent (timeline)
  ├─ DeliveryDrop (logistics grouping, driver, proof)
  └─ InvoiceOrder ─ Invoice (immutable amounts)
```

## Local setup

Requirements: Node 20+, a PostgreSQL database (a Neon branch works), and a second, disposable PostgreSQL database for tests.

```bash
# Backend
cd backend
cp .env.example .env            # fill in DATABASE_URL, DIRECT_URL, TEST_DATABASE_URL, JWT_SECRET
npm install
npx prisma generate
npx prisma migrate deploy        # applies committed migrations (never `db push` / `migrate reset`)
npx prisma db seed               # deterministic reviewer data (safe to rerun)
npm run start:dev                # http://localhost:3001

# Frontend
cd ../frontend
cp .env.example .env.local       # NEXT_PUBLIC_API_URL=http://localhost:3001
npm install
npm run dev                      # http://localhost:3000
```

Use `prisma migrate deploy` to apply migrations. Migration `20261004000000_price_tier_single_default_and_settings_singleton` adds two raw-SQL invariants that the Prisma schema language cannot express:
- a partial unique index allowing one active default price tier;
- a `PlatformSettings.id = 1` check constraint.

`db push` would not create them, and `migrate dev` may propose dropping them.

## Environment variables

**Backend (`backend/.env`):**

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | yes | Pooled connection used by the API. |
| `DIRECT_URL` | yes | Direct connection used by the Prisma CLI (migrate, seed). |
| `TEST_DATABASE_URL` | for DB tests | A **separate** disposable database. Test startup refuses to run if it targets the same database as `DATABASE_URL` or `DIRECT_URL`. |
| `JWT_SECRET` | yes | At least 32 characters. |
| `JWT_EXPIRES_IN` | no | Seconds (default 28800). |
| `FRONTEND_URL` | no | Comma-separated CORS origins (default `http://localhost:3000`). |
| `AUTH_COOKIE_SAME_SITE` | no | `lax` (default) or `none` (cross-site deployments). |
| `PORT` | no | Default 3001. |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | no | Delivery-proof photo storage (private Cloudinary assets). Set all three or none: with none, photos are disabled and note-only delivery still works; a partial set fails startup naming the missing variable. Backend only: on Render, set them on the backend service, never on the frontend. |

**Frontend (`frontend/.env.local`):**

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_API_URL` | The NestJS base URL. The client always sends `credentials: "include"`. |

## Reviewer accounts

All accounts use the password `Test@1234`.

| Email | Role | Can |
|---|---|---|
| `admin@test.com` | ADMIN | Everything (configuration, orders, overrides, billing, dashboards) |
| `kitchen@test.com` | KITCHEN | Kitchen board, start and complete prep, Kitchen dashboard |
| `dispatch@test.com` | DISPATCH | Dispatch board, assign driver, out for delivery, view proof |
| `driver@test.com` | DRIVER | Their own drops for today; deliver them |

## Domain rules

### Business time

- **Timezone:** every business date and time uses `PlatformSettings.businessTimezone`. The seed sets `Asia/Kolkata`. The server and browser timezones never matter.
- **Delivery instant:** `deliveryAt` is built from the business-local delivery date plus the business-local time, in the configured timezone (Temporal).
- **Date inputs:** dates must be strict `YYYY-MM-DD`; full timestamps are rejected.
- **Calendars:** the Company calendar (working days and holidays) decides which dates a company accepts deliveries. The Kitchen calendar (Kitchen working days and Kitchen holidays) only drives cut-off.

### Cut-off

`cutoffAt` is found by starting from the delivery date and stepping back `cutoffWorkingDayCount` Kitchen working days, skipping Kitchen holidays and non-working days. The cutoff time on that day, in the business timezone, is `cutoffAt`.
- A count of `0` means cut-off is on the delivery date itself.
- `now >= cutoffAt` means cut-off has passed. Exact equality counts as passed.

`POST /orders/cutoff/process` is idempotent:
- DRAFT → CANCELLED.
- PLACED → CONFIRMED:
  - `billableTotalCents` is frozen from the total read under the row lock;
  - exactly one PrepUnit is created per combination, with a station snapshot (or `"Unassigned"`);
  - an `ORDER_CONFIRMED` event is written.
- Response: `{ processedCount, cancelledCount, confirmedCount, skippedCount, failures[] }`.

Editing an order and cut-off lock the same Order row, so either the edit commits first and confirmation uses the new total, or cut-off wins and the edit gets 409.

### Pricing

- **Tiers:** each company uses its own price tier if it has one, otherwise the single active default tier. The database enforces that only one active default exists, and tier changes are serialized with an advisory lock.
- **Explicit overrides win.** Otherwise:
  - **MANUAL:** a missing price means the item is unavailable, never free.
  - **COST_MULTIPLIER:** `cost × multiplier`, using integer basis points.
  - **TIER_PERCENTAGE:** `source tier price × (1 + adjustment)`, applied recursively. Inactive source tiers and cycles are rejected.
- **Rounding:** every derived step rounds up to the next 5 cents (210 → 210, 211 → 215, 216 → 220).
- **Money:** all money is integer cents, with BigInt for intermediate multiplication.

### Menu orderability

One shared policy (`menu/orderability.policy.ts`) drives both the Employee Menu Preview and the Order validation used by create, edit and place. It checks:
- active categories, menu items, Dishes, Options and Portions;
- Company-hidden categories and Dishes;
- Dish and Option prices;
- required option groups.

A required option group with no usable choice makes the Dish unorderable. Secret categories are hidden from the normal preview but stay reachable by direct slug and orderable; that access never bypasses inactivity, hiding or pricing. Allergy and dietary matches are warnings, never blocks.

### Orders

- **Delivery choices:** create and update accept optional `deliveryAddressId`, `deliveryTime` (HH:mm) and `packagingTypeId`.
  - Omitted on **create** → the Employee and Company defaults.
  - Omitted on **update** → the current selection is kept.
  - A non-default choice requires the Employee's `canChooseDeliveryAddress`, `canChangeDeliveryTime` or `canChangePackaging` flag.
  - The address must be active and belong to the Employee's company, and the packaging must be active.
- **Line quantity:** `SUM(combination.quantity) == line.quantity`. A required group needs exactly one selection; an optional group allows zero or one. Minimum quantities are enforced.
- **Snapshots:** lines, combinations and options snapshot names, SKUs and prices; orders snapshot address, packaging and the delivery lead time. Later catalogue or company changes never rewrite history.
- **Edit and place:** one transaction:
  1. Lock the Order row.
  2. Reload it, then re-check cut-off and status.
  3. Re-validate against the menu and reprice.
  4. Replace the graph children-first: options, then combinations, then lines.
  5. Update the totals and status.
  A PLACED order never reverts to DRAFT, and DRAFT → PLACED writes `ORDER_PLACED` once.
- **Lifecycle:** DRAFT → PLACED → CONFIRMED (cut-off) → DELIVERED (driver). CANCELLED and REJECTED are terminal. Every transition locks the row and uses a conditional update, so a lost race returns 409.
- **Confirmed cancellation:** a confirmed order stays **fully billable**: `billableTotalCents` is unchanged and its PrepUnits remain as history. Before departure the order leaves its mutable Drop, the group is reconciled, and an emptied Drop is deleted, all atomically. Once the Drop is OUT_FOR_DELIVERY or DELIVERED, cancellation returns 409.
- **Admin delivery override** (PLACED or CONFIRMED orders):
  - the address must belong to the same company and be active, and the packaging must be active;
  - the exact instant must fall on the order's business date and respect the Company calendar;
  - it never reprices;
  - a packaging-only change never regroups, while an address or time change regroups atomically before departure and returns 409 after.

### Kitchen

- **PrepUnit state** comes from timestamps: NOT_STARTED (no start time), STARTED, DONE.
- **Recording work:** finishing an unstarted unit records both start and done. The first start sets `kitchenStartedAt` and writes `KITCHEN_STARTED`; the last completion sets `kitchenReadyAt` and writes `KITCHEN_READY`. Each happens exactly once under the parent Order lock.
- **Timing** uses one shared helper: `plannedDispatchReadyAt = deliveryAt − deliveryLeadMinutesSnapshot` and `plannedKitchenReadyAt = plannedDispatchReadyAt − kitchenReadyBufferMinutes` (current setting; nothing is stored). Unfinished work is **LATE** when `now >= plannedKitchenReadyAt`, and **AT_RISK** within `atRiskWindowMinutes` before that (a window of 0 is valid). Completed work is never late.
- **Grouping failures:** if grouping fails after Kitchen work is saved, the response reports `dispatch: { status: "FAILED", recovery: "POST /dispatch/drops/reconcile" }`. Reconciliation is idempotent.

### Dispatch and Driver

- **Grouping:** when every CONFIRMED order with the same company, address and exact delivery time is Kitchen-ready, the group shares **one** mutable `DISPATCH_READY` Drop. A transaction-scoped advisory lock per grouping key makes this safe under concurrency. Drops that are `OUT_FOR_DELIVERY` or `DELIVERED` are immutable, and a later-ready matching order gets a new Drop.
- **Enum names:** the backend uses `DISPATCH_READY`, `OUT_FOR_DELIVERY` and `DELIVERED`. The UI shows them as "Dispatch Ready", "Out for Delivery" and "Delivered".
- **Assign driver:** the Drop must be `DISPATCH_READY`, and the driver must be an active staff user holding `driver.own_drops.deliver` (checked by permission, not role name).
- **Out for delivery:** `DISPATCH_READY → OUT_FOR_DELIVERY` requires a driver. Both use conditional updates, so a concurrent loser gets 409.
- **Driver identity** always comes from the JWT. "Today" means the current **business** date.
- **Delivery** happens in one transaction: lock the Drop, then its Orders.
  - The Drop moves `OUT_FOR_DELIVERY → DELIVERED` and `deliveredAt` is set exactly once.
  - Every attached CONFIRMED order moves to `DELIVERED` with one event each.
  - Any inconsistency fails the whole delivery.
  - A repeated delivery returns 409 and keeps the first `deliveredAt`.
- **onTime** (derived, not stored): `null` before delivery; afterwards `deliveredAt <= scheduledDeliveryAt`. Exact equality is on time, with no grace period.
- **Proof photo** (optional):
  - JPEG, PNG or WebP up to 5 MB, verified by magic bytes. MIME type and filename are ignored, so SVG and HTML are rejected.
  - The server uploads the photo to Cloudinary as an **authenticated** (private) image with a server-generated `public_id` under `delivery-proofs/<dropId>/<uuid>`, before the database transition. `DeliveryDrop.photoUrl` stores only the opaque locator `<public_id>.<format>`, never a URL. If the transition fails, the asset is destroyed best-effort and the original error is returned.
  - `GET /dispatch/drops/:id/proof-url` (requires `dispatch.read`) returns a 5-minute Cloudinary private download URL generated on demand from the locator on that Drop; callers never supply a `public_id`. A locator in an unknown format returns 410 "Photo unavailable".
  - Without Cloudinary configuration, photo delivery and proof URLs return 503 "Photo upload is not configured"; note-only delivery works. An invalid or oversized photo is a 400.

### Staff and business clock

- **Staff accounts** (`staff.manage`): `GET /staff` (paginated, search by name or email), `GET /roles`, `POST /staff` and `PATCH /staff/:id`. Emails are unique regardless of letter case. Passwords follow the reviewer-account strength: 8-72 characters with upper and lower case, a digit and a symbol. They are stored as bcrypt hashes and never returned. Deactivated staff cannot sign in, and any existing session stops working on its next request. Admins cannot deactivate themselves or move themselves to a role without `staff.manage` (409).
- **Driver list** (`dispatch.assign_driver`): `GET /staff/drivers` returns active staff whose role grants `driver.own_drops.deliver`, chosen by permission and never by role name.
- **Business clock** (any signed-in user): `GET /business-time/now` returns `{ businessDate, timezone, serverNow }` and no other settings.

### Billing

- **Billable** means `billableTotalCents != null`, not the current status. Confirmed-then-cancelled orders are billable; orders cancelled before confirmation are not.
- **Creating an invoice** locks the selected orders, then checks:
  - they all exist;
  - they all belong to the same company;
  - they are all billable;
  - none is already invoiced.
- **Amounts:** `InvoiceOrder.amountCents = billableTotalCents` and `Invoice.totalCents = SUM(amounts)`. An order can be on at most one invoice, and invoices are immutable.
- **Mark Paid** is conditional: the first paid timestamp is kept, and a second attempt returns 409.

### Dashboards

All metrics are computed by the backend; the frontend only formats them. Orders are grouped by **delivery date**; Drops by whether their scheduled delivery time falls on the **business date**. Missing counts are `0`; a missing "next" item is `null`. The tile tooltips use this exact wording (`frontend/src/lib/dashboard-definitions.ts`).

| Dashboard | Metric | Definition |
|---|---|---|
| Admin | Today's orders | Orders whose delivery date is today's business date, in any status except Cancelled and Rejected (drafts and placed orders count). Grouped by delivery date, not by when the order was made. |
| Admin | Today's billable | Sum of the billable amount frozen at cut-off confirmation for orders delivering today. Includes orders cancelled after confirmation. Drafts and placed orders have no billable amount yet and add nothing. 0 when there are none. |
| Admin | Uninvoiced | Sum of billable amounts on orders that are not on any invoice yet, across all delivery dates. Includes confirmed-then-cancelled orders; orders cancelled before cut-off are never billable. |
| Admin | Late kitchen work | Confirmed orders on any delivery date that are not kitchen-ready, still have unfinished prep units, and whose planned kitchen-ready time (delivery time − company lead minutes − kitchen buffer) has passed. Sub-line: their unfinished prep units. Cancelled orders are excluded. |
| Admin | Active deliveries | Drops scheduled for today's business date that are Ready to leave or Out for delivery. Delivered drops are excluded. |
| Admin | Meals today | Sum of line quantities (one meal per boxed portion) on orders delivering today that are Confirmed or Delivered. Orders cancelled after confirmation stay in billable value but are not cooked, so they are not meals; drafts, placed and rejected orders are excluded. |
| Admin | Delivered today | Today's drops (by scheduled delivery time) that are delivered, and how many were on time (`deliveredAt <= scheduledDeliveryAt`). Undelivered drops are not counted. |
| Admin | Placed awaiting cut-off | Placed orders with a delivery date of today or later: count and sum of their current `totalCents` (not frozen until cut-off). Drafts are excluded. |
| Admin | Oldest uninvoiced | Earliest delivery date among billable orders not on any invoice (same set as Uninvoiced); `null` when there are none. |
| Admin | Deliveries by date | For each delivery date from today−3 to today+7: Confirmed and Delivered orders and their meals. Dates with none are returned as 0. |
| Admin | Status mix this week | Order count per status (all six) for delivery dates in the current business week, Monday to Sunday. |
| Admin | Top companies this week | Top 5 companies by meals for delivery dates in the current business week (Confirmed and Delivered orders), with their order counts; ties by name. |
| Kitchen | Not started | Prep units of confirmed orders delivering today that have no start time. Units of orders cancelled after confirmation are excluded. |
| Kitchen | In progress | Prep units of confirmed orders delivering today that have a start time but no done time. |
| Kitchen | At risk | Unfinished prep units of confirmed orders delivering today whose planned kitchen-ready time is less than the at-risk window away but has not passed yet. |
| Kitchen | Late now | Unfinished prep units of confirmed orders delivering today whose planned kitchen-ready time has passed. Exactly at the deadline counts as late. |
| Kitchen | Next deadline | The earliest planned kitchen-ready time among today's unfinished prep units, with that order's remaining unit count. Empty when everything is done. |
| Kitchen | Prep units today / done | All prep units on Confirmed or Delivered orders delivering today, and how many are done. Delivered orders keep their finished units in the total; orders cancelled after confirmation are removed because the kitchen no longer cooks them. |
| Dispatch | Ready to leave | Drops scheduled for today's business date that are Ready to leave, with or without a driver. |
| Dispatch | Unassigned | Today's Ready-to-leave drops with no driver assigned. |
| Dispatch | Out for delivery | Today's drops that are Out for delivery. |
| Dispatch | Running late | Today's drops whose scheduled delivery time has passed and that are not delivered yet (ready or out for delivery). Drops already delivered late are not counted. |
| Dispatch | Drops today | Drops whose scheduled delivery time falls on today's business date, in any status. |
| Dispatch | Waiting on kitchen | Confirmed orders delivering today that are not kitchen-ready yet, so they have no drop. Cancelled orders are excluded. |
| Dispatch | Delivered today | Same as the admin figure: today's delivered drops and how many were on time. |
| Driver | Today | Drops assigned to you and scheduled for today's business date, in any status. |
| Driver | Delivered | Your drops today that are delivered. |
| Driver | Remaining | Your drops today that are not delivered yet. |
| Driver | Next stop | Your earliest drop today that is not delivered yet. |
| Driver | On time / late | Among your delivered drops today: on time when `deliveredAt <= scheduledDeliveryAt`, otherwise late. |

Supporting panels list rows from operational endpoints rather than new figures. The kitchen station-load and prep-totals panels group today's kitchen-board rows; the dispatch unassigned, departures and driver-load panels group today's drops; the admin "Needs attention" list links each item to where it is fixed. `GET /dispatch/drops` also returns `plannedDispatchReadyAt` per drop: scheduled delivery time minus the longest delivery lead snapshotted on its orders (computed, not stored).

## API conventions

- **Pagination:** management lists (companies, employees, dishes, options, menu categories, reference data, invoices, dispatch drops, uninvoiced orders) return `{ data, pagination: { page, pageSize, totalItems, totalPages } }`. Defaults are page 1 and page size 20; the maximum page size is 100. Sorting is stable. The Kitchen board and Driver Today are operational lists and are not paginated.
- **Errors:**

| Status | Meaning |
|---|---|
| 400 | Malformed input or UUID |
| 401 | Unauthenticated |
| 403 | Missing permission |
| 404 | Not found |
| 409 | Invalid state, duplicate, foreign-key conflict, or lost concurrency race |
| 500 | Generic message; Prisma internals are never exposed |

## Frontend

The Next.js app (App Router, client pages) is a presentation layer over the NestJS API. Detailed rules live in `frontend/DESIGN.md` and the endpoint map in `frontend/docs/API_MAP.md`.

**Stack and why**

| Library | Used for | Why |
|---|---|---|
| TanStack Query | All server state | Caching, background refetch (kitchen board every 20 s, refetch on focus), and invalidation after each mutation, so screens show the server's latest result instead of locally patched copies. A 401 from any query sends the user to `/login`. |
| TanStack Table + TanStack Virtual | Management tables; the kitchen board columns | Headless tables with server-side pagination and sorting; virtualized columns keep the kitchen board responsive with hundreds of prep units. |
| nuqs | Filters, tabs, page and search | State lives in the URL, so a filtered view can be shared, reloaded and navigated with Back. |
| shadcn/ui on Base UI | Primitives (dialog, sheet, select, popover, command palette) | Accessible, keyboard-operable components that are copied into the repo (`src/components/ui`) and themed with Fernleaf tokens. |
| react-hook-form + zod | Larger forms (sign-in, order builder) | Typed client-side checks for obvious mistakes; the server stays the authority and its 400 messages are shown next to the field or above the submit button. |

**Rules the frontend follows**

- Every request goes through `src/lib/api-client.ts` (`NEXT_PUBLIC_API_URL`, `credentials: "include"`). The session cookie is HttpOnly and never read by JavaScript.
- Business rules (pricing, cut-off, orderability, kitchen timing, grouping, on-time, invoice totals, dashboard metrics) are computed by the API. The only client-side money sums are the labelled estimates in the order builder and invoice selection, in integer cents.
- Dates use the business timezone and "today" comes from `GET /business-time/now`, so changing the browser's timezone does not change the business date.
- Navigation and buttons are gated with `can(permission)`; role names only pick the dashboard. Typing a URL the user may not open shows Access denied, and the API returns 403 regardless.

**Design system summary**

- **Palette meaning:** primary fern for primary actions, links, the active nav item and the focus ring (never a status); saffron only for "today" and unsaved changes.
- **Status colours:** amber (warning) needs attention soon; red (danger) a broken promise or failed action; green (success) finished correctly; violet (progress) locked in and being worked; blue (info) waiting on the next step; grey (neutral) inactive, draft or cancelled. A status is always shown as icon + text + soft tint by `StatusBadge`, never by colour alone.
- Light and dark themes share the same tokens (`src/app/globals.css`); components use tokens only, with no literal colours. Motion respects `prefers-reduced-motion`, and every interactive element has a visible focus ring.
- Dashboard tile tooltips use the exact wording of the [Dashboards](#dashboards) table, from `src/lib/dashboard-definitions.ts`.

## Testing

```bash
cd backend
npm test                 # unit tests (no database, no Cloudinary)
npm run test:e2e         # PostgreSQL integration + HTTP tests against TEST_DATABASE_URL
npm run test:db:migrate  # apply migrations to the test database only
npx tsx prisma/verify-seed.ts   # verify seeded data on the development database
```

**Test database safety:** the e2e setup checks `TEST_DATABASE_URL` before the app loads.
- **Same database:** it refuses to run if the URL targets the same database as `DATABASE_URL` or `DIRECT_URL`. The comparison normalizes the host (including Neon `-pooler`), port and database name.
- **Redirect:** it points `DATABASE_URL` and `DIRECT_URL` at the test database.
- **Migrations:** it runs `prisma migrate deploy` there.
- **Fixtures:** tests create `TEST-*`-marked fixtures and delete only those rows, in foreign-key order. Suites run serially.

Concurrency guarantees are proven with independent PostgreSQL connections, not mocks:
- edit vs cut-off;
- final PrepUnit completion;
- grouping;
- assign driver, out for delivery and deliver;
- default price tier;
- lock ordering.

Against a remote database (about 250 ms round trip) the full e2e run takes about 20 minutes.

## Seed data

`npx prisma db seed` is deterministic (stable UUIDv5 IDs) and idempotent. A rerun updates seed-owned records in place and prunes non-seed children of seed orders. It never resets the database. Dates come from the business date at seed time (Asia/Kolkata):

- **History:** 7 days of delivered orders in driver-delivered Drops, with a mix of on-time and late deliveries.
- **Today:** dispatch-ready, out-for-delivery and delivered Drops for `driver@test.com`.
- **Future:** 28 calendar days, each with a confirmed, Kitchen-ready order in a dispatch-ready Drop assigned to `driver@test.com`.
- **Scenarios:** all six order statuses, confirmed-then-cancelled, rejected, multi-combination and portion orders, unfinished Kitchen work, and paid and unpaid invoices.

`prisma/verify-seed.ts` checks:
- coverage relative to the **current** business date (each day from today to +14 has a driver-assigned delivery);
- accounts, roles and permissions;
- money, snapshots, combinations, PrepUnits, Drops and invoices;
- calendar validity;
- that seeded statuses match runtime semantics.

Reseed at least every two weeks to keep 14 days of future data visible.

## Scope and trade-offs

- **Out of scope:**
  - a customer-facing ordering app;
  - payment gateway, partial payments and refunds;
  - tax;
  - notifications;
  - date-scheduled menus;
  - exports;
  - JWT revocation and sessions.
- **Planned Kitchen and dispatch times are derived, not stored.** A change to the Kitchen buffer setting therefore moves the deadlines of existing orders; the delivery lead time is snapshotted per order.
- **Grouping after Kitchen work** runs after the Kitchen transaction commits, so Kitchen work is never lost. Failures are reported and repaired by the idempotent reconcile endpoint rather than a queue.
- **Admin-only invoice creation; no credit notes.**
- **Selector lists** request one page of 100 items. Reference data is small; a larger catalogue would need search-as-you-type selectors.
- **Existing orders:** orders created before the business-time fix keep their stored `deliveryAt`; reseeding refreshes demo data.

## Ambiguities and how they were interpreted

- **Portion sizes are defined per option group**, with an extra charge per size. Every option in a group that sells in portions therefore supports all of that group's sizes by construction; there is no per-option list of supported sizes.
- **Boolean filters** (`isActive`, `invoiced`) accept only `true`/`false`/`1`/`0`; anything else is a 400 rather than being guessed.
- **"Missing a price"** counts active dishes or options that the same resolver the menu uses cannot price on a tier. A dish left off a preview because it is hidden or inactive is not counted as unpriced.
