<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This project runs Next.js 16 with React 19. APIs, conventions and file structure may differ from your training data. Before writing routing, data, caching, metadata, image or config code, read the relevant guide in `node_modules/next/dist/docs/` and follow any deprecation notices.
<!-- END:nextjs-agent-rules -->

# Fernleaf Kitchen: Frontend Agent Guide

This is the admin panel for Fernleaf Kitchen, the Heizen Engineering hiring assignment. Kitchen staff use it to run corporate meal programs: catalogue, pricing, companies, employees, orders, the kitchen board, dispatch, driver delivery, billing and role dashboards.

Read this file first in every session. Then read only what the task needs:

- `frontend/DESIGN.md`: tokens, status colours, component rules, page templates. Created in Frontend Phase 0.
- `frontend/docs/API_MAP.md`: every backend route, its permission and response shape. Created in Frontend Phase 0.
- Root `README.md`: architecture, domain rules, dashboard definitions.

Do not re-scan the whole repo or the backend when these files answer the question.

---

## 1. Architecture (non-negotiable)

```text
Browser ──► Next.js (App Router, client pages) ──HTTP/JSON──► NestJS API ──► Prisma ──► PostgreSQL
```

- Next.js is a presentation layer only. All business rules live in NestJS.
- No Server Actions containing business logic. No route-handler BFF. No Prisma, SQL or database access in `frontend/`.
- Every request goes through `src/lib/api-client.ts` (`apiRequest`). It uses `NEXT_PUBLIC_API_URL` and `credentials: "include"`.
- Authentication is the HttpOnly cookie `heizen_access_token`, set by the backend. Never read, write or store a token in JS, localStorage or sessionStorage.
- Never hardcode `http://localhost:3001` or any backend URL.
- Do not modify backend code from a frontend task. If an endpoint is missing or its response blocks the UI, stop that part and report it under **Backend gaps** with the exact route and fields needed.

---

## 2. Stack

| Concern | Choice |
|---|---|
| Framework | Next.js 16 (App Router), React 19, TypeScript strict |
| Styling | Tailwind CSS v4, tokens in `src/app/globals.css` |
| Components | shadcn/ui (style `base-nova`, Base UI primitives), icons from `lucide-react` only |
| Server state | TanStack Query |
| Tables | TanStack Table (server pagination and sorting) |
| Long lists | TanStack Virtual (kitchen board must handle about 400 orders) |
| URL state | nuqs (filters, tabs, pagination) |
| Forms | react-hook-form + zod (`@hookform/resolvers`) |
| Dates | date-fns plus `Intl.DateTimeFormat` with the business timezone |
| Toasts | sonner |
| Theme | next-themes (`class` strategy, default `system`) |
| Fonts | Geist (UI) and Geist Mono (numbers, money, SKUs, order numbers, times) via `next/font/google` |

Add a dependency only when it does substantial work, and be ready to justify it in the README. Never add a second component library, a second icon set or a second data-fetching library.

---

## 3. Commands

Run from `frontend/`:

```bash
npm install
npm run dev            # http://localhost:3000, needs the backend on NEXT_PUBLIC_API_URL
npm run lint
npx tsc --noEmit
npm run build          # if Turbopack cannot spawn workers in the sandbox: npm run build -- --webpack
```

A task is not done until `lint`, `tsc --noEmit` and `build` pass. Report the exact results. Do not hide warnings or pre-existing failures.

Environment (`.env.local`, never committed):

```bash
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_CURRENCY=INR                 # formatting only; money is integer cents
NEXT_PUBLIC_SHOW_DEMO_ACCOUNTS=true      # reviewer quick-fill buttons on /login
```

Keep `.env.example` in sync with placeholders only. No real secrets anywhere in `frontend/`.

---

## 4. Folder structure

```text
src/
  app/
    login/                    # public
    (app)/                    # authenticated shell (sidebar + top bar + providers)
      dashboard/              # renders one dashboard per role
      orders/  orders/new  orders/[id]  orders/[id]/edit
      kitchen/  dispatch/  driver/
      catalogue/  menu/  menu/preview  pricing/  pricing/[id]  reference-data/
      companies/  companies/[id]  companies/[id]/billing  employees/
      billing/  billing/invoices/[id]
      staff/  settings/
  components/
    ui/                       # shadcn primitives; generated, edit sparingly
    app/                      # shared app components (PageHeader, DataTable, FilterBar, KpiTile, StatusBadge, ...)
    <feature>/                # feature-only components (orders/, kitchen/, dispatch/, ...)
  lib/
    api-client.ts             # the only HTTP client
    api/                      # per-module API functions + types.ts (response types matching backend DTOs)
    status.ts                 # single status -> label/icon/colour map
    format.ts                 # formatMoney, business date/time formatting
    permissions.ts            # permission name constants
  hooks/                      # useBusinessClock, query hooks per feature
```

Rules:
- One feature's components never import from another feature's folder. Shared pieces move to `components/app/`.
- Query keys come from one factory per feature, for example `orderKeys.list(filters)`, `orderKeys.detail(id)`.
- Keep files under about 250 lines. Split by responsibility, not by line count alone.

---

## 5. Data and correctness rules

These mirror the assignment's non-functional requirements. Breaking them is a bug even if the screen looks right.

**Backend is the source of truth.** The UI shows server results and explains them. It does not reimplement pricing, cut-off, status transitions, combination validity, kitchen timing, on-time results or invoice totals.

**Money**
- The API sends integer cents. Format only with `formatMoney(cents)` from `src/lib/format.ts`.
- Never convert money to floats for arithmetic. Never round in the UI.
- The only client-side sum allowed is the order builder's "Estimated total" before saving, done in integer cents and labelled as an estimate. After saving, show the server's totals.

**Time**
- The kitchen runs in one business timezone: `PlatformSettings.businessTimezone`, seeded as `Asia/Kolkata`.
- Format every date and time with that timezone. Never use the browser timezone.
- "Today" is the business date from the backend, never `new Date()` in the browser. `useBusinessClock()` supplies the business date, timezone and server-time offset for countdowns.
- Delivery dates are calendar dates (`YYYY-MM-DD`). Do not turn them into `Date` objects at midnight UTC.

**Pagination**
- List endpoints return `{ data: T[], pagination: { page, pageSize, totalItems, totalPages } }`. The maximum `pageSize` is 100.
- Lists paginate on the server. Never fetch everything and paginate in the browser, except small select lists via the existing `listAll` helper.

**Permissions**
- Gate navigation and actions with `can("permission.name")` from the auth provider, using constants in `src/lib/permissions.ts`.
- Never branch on role names, except to choose which dashboard component to render.
- Hiding a button is UX, not security. The server enforces every permission. A 403 renders the `AccessDenied` state and a 401 redirects to `/login?next=<path>`.

**Mutations**
- Disable the trigger while pending.
- On success, show a past-tense toast naming the action ("Order placed", "Unit marked done") and invalidate the affected query keys, including dashboards when figures change.
- On 409 or a lost race, show "Someone else already updated this. Showing the latest." and refetch.
- Optimistic updates are used only on the kitchen board and must roll back on error.

**Errors and validation**
- Validate forms with zod for fast feedback, but treat server validation as authoritative.
- Map backend 400 messages to field errors when the field can be identified. Otherwise show a form-level alert above the submit button.
- Error text says what went wrong and what to do. Never show raw JSON, stack traces or Prisma messages.

**Types**
- No `any` in new code. Response types live in `src/lib/api/types.ts` and match the backend DTOs.
- Parse untrusted shapes such as auth/me with zod.

---

## 6. Design system summary

Full values and component rules are in `frontend/DESIGN.md`. The essentials:

**Palette:** deep fern green brand (`--primary`), cool green-tinted neutrals, and a dark fern sidebar. All colours are CSS tokens in `globals.css` with light and dark values. Never use literal hex values or raw Tailwind palette colours (`bg-red-500`, `text-stone-600`) in components.

**Colour meaning:**

| Token | Means | Used for |
|---|---|---|
| primary (fern) | Brand and action | Solid primary buttons, active nav, links, focus ring. Never a status. |
| saffron | Today / unsaved | The "today" marker on dates and charts, dirty cells and unsaved-change bars. Nothing else. |
| warning (amber) | Needs attention soon | At risk, unpaid, cut-off soon |
| danger (red) | Promise broken or action failed | Late, rejected, errors |
| success (green) | Finished correctly | Delivered, done, paid, on time |
| progress (violet) | Locked in and being worked | Confirmed, in prep, ready to leave |
| info (blue) | Waiting on the next step | Placed, out for delivery |
| neutral (grey) | Inactive | Draft, cancelled, not started, inactive |

**Status is always icon + text + soft tint**, rendered through `StatusBadge` and `src/lib/status.ts`. Never colour alone, and never a hand-styled badge.

**Type:** body 14px. Page titles 24px semibold, section titles 16px semibold, tables 13-14px. All numbers use Geist Mono with `tabular-nums`. Uppercase labels are 11-12px with 0.04em tracking.

**Surfaces:** 8px base radius. Cards have a 1px border and no shadow; only popovers and dialogs get a soft shadow. Spacing follows a 4px grid. Page padding is 24px on desktop and 16px on mobile.

**Tables:** sticky header, 44px rows with a Compact (36px) toggle. Text is left-aligned, numbers right-aligned, badges centred. Every list has a URL-synced FilterBar with removable chips.

**Page templates:** List, Detail (main 8 cols + rail 4 cols), Board, Form (section index + sticky save bar), Mobile (driver).

**Role-specific UX:**
- Kitchen board: kitchen-display conventions. Timing colour stripe on every unit, large Start/Done buttons (at least 48px), wall mode, virtualized columns.
- Dispatch: explicit transition buttons, no drag and drop. A disabled button shows why in a tooltip.
- Driver: phone first (360-430px). Next stop as a hero card, a 56px sticky "Mark delivered" button, and the photo is optional.
- Dashboards: 4-5 KPI tiles, each with a tooltip giving its exact calculation (wording matches the README) and a link to the filtered list. Then a "Needs attention" list. Nothing is calculated in the browser.

---

## 7. Every screen needs four states

1. **Loading:** a skeleton shaped like the content, not a lone spinner.
2. **Empty:** one sentence explaining why it is empty, plus the next action.
3. **Error:** an actionable message and a Retry button.
4. **Data.**

Also check each screen in light and dark mode, at 390px and 1280px wide, with keyboard only (visible focus ring, labelled inputs, `aria-label` on icon-only buttons). Respect `prefers-reduced-motion`.

---

## 8. Copy

- Buttons say exactly what happens: "Place order", "Mark out for delivery", "Create invoice". Not "Submit" or "OK".
- Toasts confirm in the past tense: "Order placed".
- Confirm dialogs state the consequence in plain words, for example: "Drafts for Thu 8 Oct are cancelled and placed orders are confirmed. Running it again is safe."
- Use domain terms the staff use: order, drop, prep unit, cut-off, tier, station, invoice. Do not use system terms like DTO, payload or entity.

---

## 9. Reviewer accounts

| Role | Email | Password | Lands on |
|---|---|---|---|
| Admin | admin@test.com | Test@1234 | Admin dashboard, full access |
| Kitchen | kitchen@test.com | Test@1234 | Kitchen dashboard and board, read-only elsewhere |
| Dispatch | dispatch@test.com | Test@1234 | Dispatch dashboard and board |
| Driver | driver@test.com | Test@1234 | Driver dashboard and own route for today |

After any change to navigation or permissions, check that each account sees only its permitted items, and that typing a forbidden URL shows `AccessDenied`.

---

## 10. Working rules for agents

- Optimize for minimum token usage. Read `DESIGN.md` and `API_MAP.md` instead of re-reading large parts of the repo.
- Do not use subagents by default. Use at most one narrow subagent, and only when genuinely blocked.
- Do not commit or push unless explicitly asked.
- Do not delete or rewrite working pages outside the current task's scope.
- Do not invent API fields. If the UI needs data the API does not return, report it as a Backend gap.
- Do not add features listed as out of scope in the assignment: exports, print/PDF, payments, notifications, audit logs, coupons, tax, delivery fees.

**End every task with this report:**

```text
A. Pages/routes built or changed
B. Shared components added or changed
C. Endpoints used (route -> screen)
D. Backend gaps (route, fields, why it blocks)
E. Deviations from the prompt and why
F. lint / tsc --noEmit / build results
G. git status --short
H. COMPLETE: YES/NO
```