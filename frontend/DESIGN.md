# Fernleaf design reference

This is the one design reference for frontend phases. Read it together with `docs/API_MAP.md` (routes) and `AGENTS.md` (architecture and working rules).

## 1. Frontend rules

1. The architecture is Browser, then Next.js (client pages), then NestJS over HTTP. No Server Actions with business logic, no route-handler BFF, no Prisma or database access.
2. Every request goes through `src/lib/api-client.ts` (`credentials: "include"`, `NEXT_PUBLIC_API_URL`). Never read or store the auth cookie in JS. Never hardcode `http://localhost`.
3. The backend owns every rule: pricing, cut-off, status transitions, combination validity, kitchen timing, the on-time result and invoice totals. The UI displays and explains server results.
4. Money is integer cents, formatted only by `formatMoney`. Never do float arithmetic on money. The one allowed client sum is the labelled "Estimated" subtotal in the order builder, computed in integer cents.
5. Dates and times are shown in the business timezone (`useBusinessClock().timeZone`), never the browser's. "Today" is the backend `businessDate`, never `new Date()`.
6. Gate navigation and buttons with `can(P.x)` from `src/lib/permissions.ts`. Role names only choose the dashboard component. Hidden buttons are UX; the server enforces.
7. Every data view has four designed states: loading (a skeleton shaped like the content), empty (one sentence plus the next action), error (an actionable message plus Retry), and data.
8. Show server validation where the user can act on it: `applyServerErrors` for fields, otherwise a `FormErrorAlert` above the submit button. Never dump raw JSON.
9. Mutations disable their trigger while pending, toast a specific verb ("Order placed", "Unit marked done") and invalidate the affected query keys. On a 409 or lost race, show `CONFLICT_MESSAGE` ("Someone else already updated this. Showing the latest.") and refetch.
10. Do not modify backend code. A missing endpoint or a blocking response goes under "Backend gaps" with the exact route and fields.
11. Use only these tokens and components. No literal hex colours or raw Tailwind palette classes (`bg-red-500`) in components, no one-off colours, and no emoji (lucide icons only).
12. Keep files small and typed, with no `any`. Response types live in `src/lib/api/types.ts` and API functions in `src/lib/api/index.ts` (imported as `@/lib/api`).

## 2. Tokens (`src/app/globals.css`)

Tokens are registered in `@theme inline`, so `bg-x`, `text-x` and `border-x` work for every name below. Dark mode is the `.dark` class (next-themes, default `system`).

| Token | Light | Dark | Use |
|---|---|---|---|
| background / foreground | #F4F6F3 / #16201B | #0D1310 / #E5ECE8 | page |
| card, popover | #FFFFFF | #141C18, #17201B | surfaces |
| primary / -foreground | #1A5D47 / #FFFFFF | #5CC195 / #06140D | brand action |
| secondary | #E8EFEA / #1C3A2C | #1D2923 / #DBE7E0 | quiet buttons, chips |
| muted / -foreground | #EDF1EE / #5C6A62 | #19221D / #96A59C | subdued text, skeletons |
| accent | #E6EFE9 | #1E2B24 | hover, selected rows |
| destructive / -foreground | #C2362E / #FFFFFF | #EF6A60 / #1A0605 | `danger` button |
| border / input / ring | #DCE3DE / #D2DBD5 / #1A5D47 | #25322B / #2D3B33 / #5CC195 | lines and focus |
| saffron / saffron-soft | #D98E1F / #FCF1DE | #F0B04F / #33260F | today and unsaved only |
| sidebar (+ -foreground, -primary, -accent, -border, -ring) | #10241A … | #09100C … | dark fern rail |
| info / info-soft | #1D5FB8 / #E7F0FB | #80B3F5 / #12243B | status |
| progress / progress-soft | #6A4BC4 / #F0ECFA | #B59DFF / #221A3C | status |
| success / success-soft | #23863F / #E4F4E9 | #6BD38D / #11301C | status |
| warning / warning-soft | #A35A00 / #FDF0DA | #F5B851 / #33240B | status |
| danger / danger-soft | #B42318 / #FDECEA | #FF8A80 / #3A1512 | status |
| neutral / neutral-soft | #55615A / #ECF0ED | #A2AEA7 / #1D2621 | status |
| chart-1 … chart-5 | fern, saffron, blue, violet, grey | lighter equivalents | charts |

Other tokens: `--radius: 0.5rem` (8px base), the `shadow-soft` utility for popovers and dialogs, and the fonts `--font-sans` (Geist) and `--font-mono` (Geist Mono).

## 3. Colour meaning

- **Primary fern** is for solid primary buttons, the active nav item, links and the focus ring. It is never a status.
- **Saffron** marks "today" on dates and charts (the calendar's today cell and the business-day chip dot) and dirty or unsaved cells and bars. Nothing else.
- **Amber (warning):** needs attention soon. **Red (danger):** a promise is broken or an action failed. **Green (success):** finished correctly. **Violet (progress):** locked in and being worked. **Blue (info):** waiting on the next step. **Grey (neutral):** inactive, draft or cancelled.
- Status is always icon, text and a soft tint, rendered by `StatusBadge`. Never use colour alone or a hand-styled badge.

## 4. Status map (`src/lib/status.ts`)

| Kind | Value | Tone | Icon | Label |
|---|---|---|---|---|
| order | DRAFT | neutral | FilePen | Draft |
| | PLACED | info | Send | Placed |
| | CONFIRMED | progress | Lock | Confirmed |
| | DELIVERED | success | CircleCheck | Delivered |
| | CANCELLED | neutral | Ban | Cancelled |
| | REJECTED | danger | CircleX | Rejected |
| prep | NOT_STARTED / STARTED / DONE | neutral / progress / success | Circle / Loader / CircleCheck | Not started / In progress / Done |
| timing | ON_TRACK / AT_RISK / LATE / COMPLETE | success / warning / danger / success | Clock / TriangleAlert / AlarmClock / CircleCheck | On track / At risk / "Late by N min" (pass `label`) / Done |
| drop | WAITING_ON_KITCHEN | neutral | ChefHat | Waiting on kitchen (UI-only: an order without a drop) |
| | DISPATCH_READY | progress | PackageCheck | Ready to leave |
| | OUT_FOR_DELIVERY | info | Truck | Out for delivery |
| | DELIVERED | success | CircleCheck | Delivered |
| onTime | ON_TIME / LATE | success / danger | CircleCheck / AlarmClock | On time / "Late N min" |
| invoice | UNPAID / PAID / NOT_INVOICED | warning / success / neutral | Receipt / BadgeCheck / Receipt | Unpaid / Paid / Not invoiced |

The backend enum is always `OUT_FOR_DELIVERY`; only the label reads "Out for delivery". The kitchen and drop timing values come from the API (`timingState`, `onTime`). Never derive them in the browser.

## 5. Type and spacing

- Scale: 12, 13, 14 (body), 16, 20, 24 and 30. Page title 24 semibold. Section title 16 semibold. Tables 13-14.
- Numbers, money, SKUs, order numbers and times use the `num` class (Geist Mono with `tabular-nums`).
- Uppercase labels use the `label-caps` class (11px, 0.04em tracking).
- Radius is 8px. Cards have a 1px border and no shadow. Popovers and dialogs use `shadow-soft`.
- Spacing follows a 4px grid. Page padding is `p-4 md:p-6` (16px mobile, 24px desktop).
- Respect `prefers-reduced-motion` (handled globally). Every icon-only button needs an `aria-label`.

## 6. App shell (`src/components/layout/`)

- **`ProtectedShell`** handles auth gating. An unauthenticated user goes to `/login?next=<path>`. A URL whose nav item the user may not open renders `AccessDenied`.
- **`AppSidebar`** uses `collapsible="icon"`: 256px expanded, a 64px rail with tooltips, state kept in the `sidebar_state` cookie, and a Sheet on mobile. Nav items come from `navigation.ts`. An item is shown when the user has every permission in any one of its `anyOf` sets and `available` is true. Empty groups are hidden.
- **`AppTopBar`** is 56px and sticky. It holds the trigger, breadcrumbs, `BusinessDayChip`, `CommandPalette` (Cmd/Ctrl+K), `ThemeToggle` and `UserMenu`.
- **Providers:** `ThemeProvider` and `AuthProvider` live in the root layout. `AppProviders` lives in the (app) layout and holds QueryClient (staleTime 15s, retry once except on 400/401/403/404/409, refetch on focus), Nuqs, Tooltip and Toaster (bottom-right on desktop, top-center on mobile). A global 401 from any query or mutation sends the user to `/login?next=`.
- **When a page ships:** set `available: true` on its nav item.

## 7. Layout templates

- **List page:** `PageHeader` (title, description, primary action), then `DataTable` with a `FilterBar` as its toolbar, all inside `<main className="flex flex-col gap-6 p-4 md:p-6">`. Filters, page and sort live in the URL (nuqs, key `page`). Clicking a row opens the detail page.
- **Detail page:** `PageHeader` with the status badge and actions, then a grid `lg:grid-cols-12`. The main column (`lg:col-span-8`) holds content cards. The rail (`lg:col-span-4`) holds facts, `MoneyBreakdown` and the timeline.
- **Board page (kitchen, dispatch):** a slim header with a date (`DateRangeFilter` or a single date) and a station or status filter. Columns or lists are virtualized with `@tanstack/react-virtual`. Use large targets (48px or more) and a timing colour stripe on the left edge (tone token). No drag and drop: explicit transition buttons, and a disabled button explains why in a tooltip.
- **Form page:** a section index on the left (lg and up), then sections as cards. A sticky save bar sits at the bottom with a saffron left edge when the form is dirty: "Unsaved changes", then Cancel and the exact action verb. `FormErrorAlert` sits above the save button.
- **Mobile page (driver):** single column at 360-430px, with the next stop as a hero card and a 56px sticky primary button ("Mark delivered"). The photo is optional.

## 8. Shared components (`src/components/app/`)

| Component | Props | Notes |
|---|---|---|
| `PageHeader` | `title, description?, actions?, tabs?` | |
| `StatusBadge` | `kind, value, label?, size?` | reads `status.ts` |
| `KpiTile` | `label, value \| null, sub?, definition, href?, sparkline?, loading?, noDataReason?` | `definition` matches the README wording exactly; value is pre-formatted |
| `DataTable<T>` | `columns, data, pagination?, onPageChange?, onPageSizeChange?, sorting?, onSortingChange?, getRowId, onRowClick?, rowSelection?, onRowSelectionChange?, isLoading?, error?, onRetry?, empty, toolbar?` | TanStack Table v8 with manual pagination and sorting; sticky header; 44px rows with a 36px Compact toggle; column menu; use `meta.align` ("right" for numbers, "center" for badges) |
| `DataTablePagination` | `pagination, onPageChange, onPageSizeChange?` | "1–25 of 312" |
| `FilterBar` | `searchKey?, searchPlaceholder?, filters?: {key,label,options}[], extra?, extraChips?, pageKey?` | 300ms debounce; 4 visible filters, the rest under "More filters"; chips and Clear all; URL-synced |
| `DateRangeFilter` | `value: {from,to}, onChange, today, label?` | presets Today, Tomorrow, This week, Next 7 days, Last 7 days, plus Custom; `today` is the backend business date |
| `DateTimeText` | `value, mode: date \| time \| datetime \| relative` | business timezone; `<time>` with a full tooltip |
| `EmptyState` | `title, description?, action?, icon?` | |
| `ErrorState` | `error, title?, onRetry?, isRetrying?` | 403 renders AccessDenied; 404 renders Not found |
| `AccessDenied` | | |
| `ConfirmDialog` | `open, onOpenChange, title, description, confirmLabel, destructive?, pending?, onConfirm` | the description states the consequence; destructive uses the `danger` button |
| `FormErrorAlert` | `messages` | pair with `applyServerErrors(error, fieldNames, setError)` from `src/lib/form-errors.ts` |
| `MoneyBreakdown` | `rows: {label,cents,muted?}[], total, note?` | right-aligned mono |

## 9. Library helpers

- `src/lib/format.ts`: `formatMoney(cents)` (`NEXT_PUBLIC_CURRENCY`, default INR, locale en-IN, built from an exact decimal string with no float), `formatBusinessDate(isoDate)` ("Sun 4 Oct"), `formatBusinessTime`, `formatBusinessDateTime`, `formatRelative` ("in 25 min"), `formatTimeOfDay` (TIME columns), `toIsoDate`, `timeZoneNames`, `formatCount`.
- `src/hooks/use-business-clock.ts`: returns `{businessDate, timeZone, timeZoneSource, nowMs, offsetMs}`. `businessDate` comes from `/dashboard/kitchen` or `/dashboard/driver`. The timezone comes from `/settings` when the user is permitted, otherwise the seeded default (a backend gap). The clock ticks every 30s and refetches every 5 minutes.
- `src/lib/api-client.ts`: `apiRequest`, `apiRequestWithMeta`, `ApiError` (`status` and `messages[]`), `isApiError`, `describeError`, `CONFLICT_MESSAGE`.
- `src/lib/query-client.ts`: `createQueryClient`, `loginUrl`, `safeNextPath`.
- Query keys use one factory per feature, for example `orderKeys.list(filters)`.

## 10. Kitchen board conventions

- One `GET /kitchen?date=` per date, refetched every 20 s and on focus. Station tabs, state/timing filters, search and prep totals are computed in memory from that one response; every column is virtualized.
- `prepState` and `timingState` are used exactly as the API returns them. The only display-only derivation is the minutes in the badge text: "Late by N min" = server-adjusted now (`useBusinessClock`) − `plannedKitchenReadyAt`, and "At risk · N min left" = `plannedKitchenReadyAt` − now. The state itself never changes in the browser until the next refetch; planned times are never edited in the UI.
- Card stripe: 4px `bg-danger` (late) or `bg-warning` (at risk), always paired with the badge text, so colour is never the only signal.
- Start/Done are optimistic (the card moves at once) and roll back on error. A 409 shows "Already updated by someone else" and refetches. Actions need `kitchen.update`; force complete needs `kitchen.force_complete`; anyone else sees the board read-only.
- Wall mode (`?wall=1`): full-screen overlay without sidebar and top bar, 18px base size (card type scales in `em`), auto-refresh continues, Esc exits.

## 11. Dispatch and driver conventions

- **Drag and drop as a shortcut; buttons stay primary.** Dragging a "Ready to leave" card onto "Out for delivery" calls the same server-validated transition as the "Mark out for delivery" button, which remains the primary, accessible path. Only ready cards are draggable (via a grip handle), only "Out for delivery" accepts a drop, and "Delivered" is never a target (only the driver delivers). There is no reordering inside a column; columns stay sorted by delivery time.
  - While dragging, the target column gets a primary tint and outline; the other columns are dimmed with a not-allowed cursor. Auto-refresh pauses until the drag ends.
  - Pointer, touch (150 ms press) and keyboard: Space picks up, the arrow keys jump between Ready to leave and Out for delivery, Space drops, Esc cancels. Screen-reader announcements describe each step.
  - A blocked move (no driver) snaps back with the same reason as the disabled button: "Assign a driver first". A valid move is optimistic and rolls back on error; a 409 shows "Someone else already updated this. Showing the latest." and refetches.
  - Users without `dispatch.update` get no handles and no buttons (read-only board). The kitchen board never uses drag and drop.
- **Kitchen readiness:** a drop exists only once all of its orders are kitchen-ready, so drop cards never show "x of y kitchen-ready" or "still cooking". "Waiting on kitchen" is a column of individual confirmed orders without a drop, subtitled "Orders still being cooked. They become a drop when ready."
- **Search and driver filter** are sent to `GET /dispatch/drops` (`search`, `driverId` incl. `none`), debounced 300 ms, URL-synced and applied before pagination. The summary strip counts the whole day (unfiltered).
- **Drop contents:** cards and the table show "4 orders · 23 meals"; the drop panel lists the drop's own `orders` and packaging counts from the API.
- **Leave-by countdown:** display-only arithmetic on the API's `plannedDispatchReadyAt` against the server-adjusted clock ("Leave by 11:00 · in 18 min", warning once passed). Nothing is reclassified.
- **Driver picker** assigns on change ("Driver assigned") and tags the company default driver "Default". It lists `GET /staff/drivers` (by permission, so admins can appear).
- **Proof photos:** "View photo" opens a tab synchronously, then fetches the short-lived signed URL; the URL is never stored.
- **Driver route:** phone first (360-480px), no sidebar for driver-only roles, 56px sticky "Mark delivered" with safe-area padding, every tap target at least 44px. Stops show packaging ("18 boxed · 5 eco-tray") and meals. Note and photo are optional; the browser checks JPEG/PNG/WebP and 5 MB for fast feedback and the server re-validates. A failed delivery keeps the note and photo for Retry.

## 12. Catalogue, menu and pricing conventions

- **Form pages** (dish, option): one scrolling form with `SectionIndex` on the left (lg+) and `StickySaveBar` (saffron edge) while dirty; `useUnsavedChangesGuard` warns before leaving. Read-only roles see the same form disabled with no actions.
- **Money and ratio inputs** are parsed as strings (`lib/decimal-input.ts`): "105.50" -> 10550 cents, "2.4" -> 24000 bps, never through floats. Display still uses `formatMoney`.
- **Reordering** uses keyboard-accessible up/down buttons (`ReorderButtons`), no drag library. Menu items save with one `PUT /menu/categories/:id/items`.
- **Company hiding** is read from `GET /menu/categories/:id` (`hiddenByCompanyIds` on the category and each item) and saved with `PUT /menu/categories/:id/hidden-companies` or `PUT /menu/dishes/:id/hidden-companies` (whole set, one transaction, `catalogue.manage`). Dish hiding applies on every menu.
- **Tier editor** is spreadsheet-like: override cells are inputs; Up/Down/Enter move between cells, Tab moves naturally, Esc reverts a cell, an empty cell clears the override. Dirty cells use `bg-saffron-soft`. One `PATCH /price-tiers/:id/prices` saves every change; row errors come back by `dishOverrides.N` / `optionOverrides.N` path. The Derived column always shows the tier formula (`derivedCents`), even for overridden rows, so staff can compare the override with the formula.
  - **Options are a separate section** because the API prices an option once per tier and shares it across every dish that offers it; nesting options under a dish would suggest a per-dish option price that does not exist.
  - **"Override" uses the violet (progress) status tint**, not primary: primary fern is reserved for actions, and violet already means "locked in". Derived is neutral and Missing is danger.
- **Reference data** tables edit names in place (blur or Enter saves, Esc reverts) and switch Active; nothing is hard-deleted.

## 13. Copy

Buttons say exactly what happens ("Place order", "Mark out for delivery", "Create invoice"). Toasts use the past tense. Confirm dialogs state the consequence in plain words. Use staff vocabulary: order, drop, prep unit, cut-off, tier, station, invoice.
