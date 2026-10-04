# API map (NestJS backend)

Generated in Frontend Phase 0 from the controllers, services and DTOs in `backend/src`. Later phases read this file instead of the backend. If the backend changes, update this file in the same change.

## Conventions

- Base URL: `NEXT_PUBLIC_API_URL`. Auth: HttpOnly cookie `heizen_access_token`, sent with `credentials: "include"`.
- Guards run in order: JWT (401), then permissions (403). Every route needs a signed-in user unless marked Public.
- Malformed UUID or validation failure: 400 with `{ message: string | string[] }`. Unknown body fields are rejected (`forbidNonWhitelisted`). Missing resource: 404. Invalid state, lost race or duplicate: 409.
- **Pagination envelope** (every route marked P): `{ data: T[], pagination: { page, pageSize, totalItems, totalPages } }`. Query `page` (default 1) and `pageSize` (default 20, max 100). Routes marked P+s also accept `search` (max 100 characters).
- Money: integer cents. Timestamps: ISO UTC strings. `deliveryDate` and other DATE columns serialize as `YYYY-MM-DDT00:00:00.000Z`; use the first 10 characters as the business calendar date. TIME columns (`cutoffTime`, `defaultDeliveryTime`) serialize as `1970-01-01THH:mm:00.000Z`, holding business-local wall-clock time.
- Write times as `HH:mm` and dates as `YYYY-MM-DD`.
- **Boolean query params** (`isActive`, `invoiced`) use the shared `@BooleanQuery()` transform: `true`/`1`, `false`/`0`, or omit; anything else is 400.

## Seeded roles to permissions

| Role | Permissions |
|---|---|
| ADMIN | all 26 below (includes driver.own_drops.* and staff.manage) |
| KITCHEN | catalogue.read, orders.read, kitchen.read, kitchen.update, dashboards.read |
| DISPATCH | companies.read, orders.read, kitchen.read, dispatch.read, dispatch.update, dispatch.assign_driver, dashboards.read |
| DRIVER | driver.own_drops.read, driver.own_drops.deliver |

All permissions: catalogue.read/manage, pricing.read/manage, companies.read/manage, employees.read/manage, orders.read/create/edit/override, kitchen.read/update/force_complete, dispatch.read/update/assign_driver, driver.own_drops.read/deliver, billing.read/manage, settings.read/manage, dashboards.read, staff.manage.

## Auth / health

| Method | Route | Permission | Body / query | Response |
|---|---|---|---|---|
| POST | /auth/login | Public | `{email, password}` | `AuthenticatedUser` and sets the cookie |
| GET | /auth/me | signed in | | `{id, name, email, role, permissions: string[]}` |
| POST | /auth/logout | Public | | `{success: true}` and clears the cookie |
| GET | /health, /health/db | Public | | liveness |
| GET | /business-time/now | signed in (no permission) | | `{businessDate: "YYYY-MM-DD", timezone, serverNow: ISO}`. Use it for the business clock for every role. |

## Dashboards (the response is NOT wrapped in `data`)

| Method | Route | Permission | Response |
|---|---|---|---|
| GET | /dashboard/admin | dashboards.read + billing.read + orders.read + kitchen.read + dispatch.read | `{businessDate, metrics:{todayOrders, todayBillableCents, uninvoicedCents, lateKitchenOrders, latePrepUnits, activeDeliveries, mealsToday, deliveredToday:{delivered, onTime}, placedAwaitingCutoff:{count, totalCents}, oldestUninvoicedDeliveryDate: YYYY-MM-DD \| null, deliveriesByDate:[{date, orders, meals}] (today-3..today+7, zero-filled), statusMixThisWeek:{DRAFT..DELIVERED: n}, week:{from, to} (Mon-Sun), topCompaniesThisWeek:[{companyId, name, meals, orders}] (max 5)}}` |
| GET | /dashboard/kitchen | dashboards.read + kitchen.read | `{businessDate, metrics:{notStarted, started, atRisk, late, nextDeadline: {plannedKitchenReadyAt, orderId, orderNumber, companyName, remainingUnits} \| null, prepUnitsTotal, prepUnitsDone}}` |
| GET | /dashboard/dispatch | dashboards.read + dispatch.read | `{businessDate, metrics:{dispatchReady, unassigned, outForDelivery, lateDeliveries, dropsToday, waitingOnKitchen, deliveredToday:{delivered, onTime}}}` |
| GET | /dashboard/driver | driver.own_drops.read | `{businessDate, metrics:{todayDrops, remaining, delivered, nextDrop: {id, scheduledDeliveryAt, companyName, addressCitySnapshot, status} \| null, onTimeCount, lateCount}}` |

`deliveriesByDate` is the only series. Definitions are in the root README under "Dashboards", and the frontend copy lives in `src/lib/dashboard-definitions.ts`.

## Orders

| Method | Route | Permission | Body / query | Response |
|---|---|---|---|---|
| GET | /orders | orders.read | P+s: `deliveryDateFrom`, `deliveryDateTo` (YYYY-MM-DD), `status`, `companyId`, `invoiced`, `deliveryDropId` (UUID), `search` (matches orderNumber, employee name or company name) | P of `Order & {employee:{name}, company:{name}, invoiceOrder \| null}`, sorted by deliveryDate desc then createdAt desc |
| GET | /orders/:id | orders.read | | `Order & {employee, company, lines:[OrderLine & {combinations:[OrderCombination & {options: OrderCombinationOption[]}]}], events:[OrderEvent & {actor:{name}\|null}], invoiceOrder}` |
| POST | /orders | orders.create | `{employeeId, deliveryDate, placeOrder, lines:[{dishId, quantity, combinations:[{quantity, options:[{optionGroupId, optionId, portionSizeId?}]}]}], deliveryAddressId?, deliveryTime?(HH:mm), packagingTypeId?}` | Order |
| PATCH | /orders/:id | orders.edit | `{placeOrder?, lines?, deliveryAddressId?, deliveryTime?, packagingTypeId?}`. Omitted fields keep their current value. | Order |
| POST | /orders/:id/place | orders.edit | | Order |
| POST | /orders/:id/cancel | orders.edit | | Order (409 once its drop is out for delivery or delivered) |
| POST | /orders/:id/reject | orders.override | `{rejectionReason}` | Order |
| PATCH | /orders/:id/delivery-details | orders.override | `{deliveryAddressId?, deliveryAt?(ISO with offset), packagingTypeId?}` | Order |
| POST | /orders/cutoff/process | orders.override | `{deliveryDate?}` | `{processedCount, cancelledCount, confirmedCount, skippedCount, failures:[{orderId, message}]}` |
| GET | /business-time/cutoff/:date | settings.read | | `{deliveryDate, cutoffInstant, passed, cutoffDate}` |

`Order` key fields: id, orderNumber, employeeId, companyId, status, deliveryDate, deliveryAt, the deliveryAddress*Snapshot fields, packagingNameSnapshot, deliveryLeadMinutesSnapshot, subtotalCents, totalCents, billableTotalCents (null before confirmation), placedAt, confirmedAt, cancelledAt, rejectedAt, rejectionReason, kitchenStartedAt, kitchenReadyAt, deliveryDropId. Line fields: dishNameSnapshot, dishSkuSnapshot, quantity, dishUnitPriceCents, lineTotalCents. Combination fields: quantity, unitPriceCents, totalCents. Option fields: optionGroupNameSnapshot, optionNameSnapshot, portionNameSnapshot, optionPriceCents, portionExtraCents. Event type is one of ORDER_CREATED, ORDER_PLACED, ORDER_CONFIRMED, ORDER_REJECTED, ORDER_CANCELLED, DELIVERY_DETAILS_CHANGED, KITCHEN_STARTED, KITCHEN_READY, DISPATCH_READY, OUT_FOR_DELIVERY or DELIVERED.

## Kitchen

| Method | Route | Permission | Body / query | Response |
|---|---|---|---|---|
| GET | /kitchen | kitchen.read | `date` (YYYY-MM-DD, required), `stationId?` | **unpaginated array** of `{id (prepUnit), orderId, orderNumber, companyName, employeeName, deliveryDate, deliveryAt, plannedKitchenReadyAt, dishNameSnapshot, quantity, stationId, stationNameSnapshot, options:[{optionGroupNameSnapshot, optionNameSnapshot, portionNameSnapshot}], startedAt, doneAt, prepState: NOT_STARTED\|STARTED\|DONE, timingState: ON_TRACK\|AT_RISK\|LATE\|COMPLETE}`. Unfinished units come first, then by earliest deadline. |
| POST | /kitchen/prep-units/:id/start | kitchen.update | | `{success, orderId, kitchenReady, dispatch:{status: NOT_READY\|GROUPED\|...; dropId?}}` |
| POST | /kitchen/prep-units/:id/done | kitchen.update | | same as start |
| POST | /kitchen/orders/:id/force-complete | kitchen.force_complete | | same as start |

## Dispatch / driver

| Method | Route | Permission | Body / query | Response |
|---|---|---|---|---|
| GET | /dispatch/drops | dispatch.read | P+s: `date?`, `status?` (DISPATCH_READY\|OUT_FOR_DELIVERY\|DELIVERED), `companyId?`, `driverId?` (UUID or `none`), `search` (company name, address label/lines/city, driver name; case-insensitive; applied before pagination) | P of `DeliveryDrop & {company:{name}, driver:{name}\|null, _count:{orders}, plannedDispatchReadyAt: ISO \| null, orders:[{id, orderNumber, employeeName, packagingName, meals}], meals, packaging:[{name, count}]}`, sorted by scheduledDeliveryAt. `plannedDispatchReadyAt` = scheduledDeliveryAt − the longest lead snapshotted on the drop's orders. |
| POST | /dispatch/drops/reconcile | dispatch.update | | `{processedGroups, unattachedReadyOrdersFound, failures:[{key, message}]}` |
| GET | /staff/drivers | dispatch.assign_driver | | **unpaginated** `[{id, name, email}]`: active staff whose role grants driver.own_drops.deliver (by permission, so it includes ADMIN) |
| POST | /dispatch/drops/:id/assign-driver | dispatch.assign_driver | `{driverId}` | DeliveryDrop |
| POST | /dispatch/drops/:id/out-for-delivery | dispatch.update | | DeliveryDrop |
| GET | /dispatch/drops/:id/proof-url | dispatch.read | | `{url, expiresInSeconds: 300}`: a Cloudinary private download URL generated on demand (open it in a new tab; never store it). 404 no photo; 410 "Photo unavailable" for an unknown/legacy locator; 503 when photo storage is not configured. |
| GET | /driver/drops/today | driver.own_drops.read | | `{businessDate, data: (DeliveryDrop & {company:{name, driverInstructions}, _count:{orders}, orders:[{id, orderNumber, employeeName, packagingName, meals}], meals, packaging:[{name, count}]})[]}` (unpaginated, own drops only) |
| POST | /driver/drops/:id/deliver | driver.own_drops.deliver | multipart: `note?`, `photo?` (JPEG, PNG or WebP, max 5 MB) | DeliveryDrop. 400 for an invalid or oversized photo; 503 "Photo upload is not configured" (or the upload failed) with the drop unchanged; note-only always works. |

`DeliveryDrop` fields: id, companyId, status, scheduledDeliveryAt, the address*Snapshot fields, driverStaffUserId, dispatchReadyAt, outForDeliveryAt, deliveredAt, deliveryNote, photoUrl (an opaque storage locator `<public_id>.<format>`, never a URL), and **onTime** (`null` before delivery, otherwise `deliveredAt <= scheduledDeliveryAt`). Meals = sum of line quantities per order; `packaging` counts orders per snapshotted packaging name.

## Catalogue / menu / reference data / pricing

| Method | Route | Permission | Body / query | Response |
|---|---|---|---|---|
| GET | /dishes | catalogue.read | P+s (name or SKU), `isActive`, `temperature` (HOT\|COLD), `stationId`, `dietaryTagId` | P of Dish (with station, allergens, dietaryTags and optionGroups including options and portions) |
| GET | /dishes/:id | catalogue.read | | Dish |
| POST / PATCH | /dishes, /dishes/:id | catalogue.manage | `{name, description, imageUrl (http/https URL), sku, temperature, costCents, minimumOrderQuantity?, stationId?, isActive?, allergenIds, dietaryTagIds, optionGroups:[{id?, name, isRequired, usesPortions, displayOrder, options:[{optionId, displayOrder}], portions:[{portionSizeId, extraChargeCents, displayOrder}]}]}` | Dish |
| POST | /dishes/:id/deactivate | catalogue.manage | | Dish |
| GET | /options | catalogue.read | P+s, `isActive` | P of Option |
| GET | /dishes/:id/prices, /options/:id/prices | pricing.read | | `[{tierId, tierName, isDefault, isActive, effectiveCents \| null, source: OVERRIDE\|DERIVED\|MISSING}]` (every tier) |
| GET / POST / PATCH | /options/:id, /options | read / manage | `{name, costCents, isActive?, allergenIds, dietaryTagIds}` | Option |
| GET | /menu/categories | catalogue.read | P+s | P of `MenuCategory & {_count:{items}, hiddenCompanyCount}` (no items) |
| GET | /menu/categories/:id | catalogue.read | | `MenuCategory & {hiddenByCompanyIds, items:[{dishId, displayOrder, isActive, dish:{id,name,sku,isActive}, hiddenByCompanyIds}]}` |
| PUT | /menu/categories/:id/hidden-companies | catalogue.manage | `{companyIds}` (full set; [] = shown to all) | `{categoryId, hiddenByCompanyIds}`; 400 lists unknown company IDs. One transaction. |
| PUT | /menu/dishes/:id/hidden-companies | catalogue.manage | `{companyIds}` | `{dishId, hiddenByCompanyIds}` (hides the dish on every menu for those companies) |
| POST / PATCH | /menu/categories, /menu/categories/:id | catalogue.manage | `{name, slug (kebab-case), displayOrder, isActive?, isSecret?}` | MenuCategory |
| PUT | /menu/categories/:id/items | catalogue.manage | `{items:[{dishId, displayOrder, isActive}]}` (**isActive is required**) | MenuCategory |
| GET | /allergens, /dietary-tags | catalogue.read | P+s | P of `{id, name, isActive}` |
| GET | /kitchen-stations, /portion-sizes, /packaging-types | catalogue.read | P+s | P of `{id, name, isActive, displayOrder}` |
| POST / PATCH | (the same five)/:id | catalogue.manage | `{name}` or `{name, displayOrder}`, plus `isActive?` on PATCH | the entity |
| GET | /price-tiers | pricing.read | | **unpaginated** `(PriceTier & {_count:{companies}, missingDishCount, missingOptionCount})[]` (counts of active items the menu resolver cannot price; null if the tier is misconfigured) |
| GET | /price-tiers/:id | pricing.read | | PriceTier |
| POST / PATCH | /price-tiers, /price-tiers/:id | pricing.manage | `{name, strategy: MANUAL\|COST_MULTIPLIER\|TIER_PERCENTAGE, isDefault?, sourceTierId?, costMultiplierBps?, sourceAdjustmentBps?, isActive?}` | PriceTier |
| GET | /price-tiers/:id/editor | pricing.read | | `{tier, dishes:[{id, name, sku, costCents, isActive, overrideCents, derivedCents, effectiveCents, source}], options:[{... same fields}]}`. `derivedCents` = the tier's formula ignoring its own override (null for MANUAL or when it cannot be derived). |
| PATCH | /price-tiers/:id/prices | pricing.manage | `{dishOverrides:[{itemId, priceCents\|null}], optionOverrides:[...]}` (null clears the override) | `{success: true}` |

## Companies / employees

| Method | Route | Permission | Body / query | Response |
|---|---|---|---|---|
| GET | /companies | companies.read | P+s (name or domain) | P of `Company & {ownerEmployee:{id,name}, priceTier:{id,name}, domains, _count:{employees, addresses}}` |
| GET | /companies/:id | companies.read | | Company with ownerEmployee, defaultDriver `{id,name,email}`, priceTier, defaultPackagingType, domains, addresses, workingDays, holidays, hiddenCategories `{category}`, hiddenDishes `{dish:{id,name,sku}}` |
| POST | /companies | companies.manage | `{name, billingContactName, billingContactEmail, billingContactPhone?, priceTierId?, defaultDeliveryTime (HH:mm), deliveryLeadMinutes, defaultPackagingTypeId, driverInstructions?, defaultDriverStaffUserId?, workingDays: DayOfWeek[], domains: string[], addresses:[...], owner:{name, email?, flags, allergenIds, dietaryTagIds}, holidays?, hiddenCategoryIds?, hiddenDishIds?}` | Company |
| PATCH | /companies/:id | companies.manage | partial of the above (omitted collections are kept) | Company |
| GET | /employees | employees.read | P+s, `companyId?` | P of `Employee & {company:{id,name}, defaultDeliveryAddress, allergens, dietaryTags, ownedCompany}` |
| GET | /companies/:companyId/employees | employees.read | P+s | same |
| GET | /employees/:id | employees.read | | Employee |
| POST | /companies/:companyId/employees | employees.manage | `{name, email?, defaultDeliveryAddressId?, canChooseDeliveryAddress, canChangeDeliveryTime, canChangePackaging, allergenIds, dietaryTagIds}` | Employee |
| PATCH | /employees/:id | employees.manage | partial of the above, plus `companyId?` | Employee |
| GET | /employees/:id/menu-preview | employees.read | | adds `rules:{tierId, tierName, usedDefaultTier, hiddenCategoryCount, hiddenDishCount, unpricedDishCount}`. Body: | `{employee, tierId, categories:[{id, name, slug, dishes:[{id, name, resolvedPriceCents, priceSource, allergens, dietaryTags, optionGroups:[{id, name, isRequired, options:[{id, name, resolvedPriceCents}]}], preferenceContext:{allergenWarnings, matchingDietaryTags}}]}]}` |
| GET | /employees/:id/menu-preview/categories/:slug | employees.read | | the same, for one category (direct access to a secret category) |

## Billing

| Method | Route | Permission | Body / query | Response |
|---|---|---|---|---|
| GET | /invoices | billing.read | P: `companyId?`, `status?` (UNPAID\|PAID) | P of `Invoice & {company:{name}, _count:{orders}}` |
| GET | /invoices/:id | billing.read | | **`{data: Invoice & {company:{name, billingContactName, billingContactEmail}, orders:[{orderId, amountCents, order:{orderNumber, status, deliveryDate, employee:{name}}}]}}`** |
| POST | /invoices | billing.manage | `{companyId, orderIds: string[]}` | **`{data: Invoice}`** |
| POST | /invoices/:id/pay | billing.manage | | Invoice (idempotent, keeps the first paidAt) |
| GET | /companies/:id/billing/uninvoiced | billing.read | P | P of `{id, orderNumber, status, deliveryDate, deliveryAt, billableTotalCents, confirmedAt, cancelledAt, employee:{name,email}}`, plus `totalUninvoicedCents` (whole company) |

## Staff

| Method | Route | Permission | Body / query | Response |
|---|---|---|---|---|
| GET | /staff | staff.manage | P+s (name or email) | P of `{id, name, email, isActive, createdAt, updatedAt, role:{id, name}}`, sorted by name. passwordHash is never returned. |
| GET | /roles | staff.manage | | **unpaginated** `[{id, name, description, permissions: string[]}]` |
| POST | /staff | staff.manage | `{name, email, roleId, password}`. The email is trimmed and lower-cased; the password is 8-72 characters with upper, lower, digit and symbol. | StaffMember (201). 409 when the email exists in any letter case; 400 for an unknown role. |
| PATCH | /staff/:id | staff.manage | `{name?, roleId?, isActive?}` | StaffMember. 409 "You cannot deactivate your own account." or when moving yourself to a role without staff.manage. Deactivated users cannot sign in, and existing sessions stop on their next request. |

## Settings

| Method | Route | Permission | Body | Response |
|---|---|---|---|---|
| GET | /settings | settings.read | | `{settings:{id, businessTimezone, cutoffTime, cutoffWorkingDayCount, kitchenReadyBufferMinutes, atRiskWindowMinutes}, workingDays: DayOfWeek[], holidays:[{id, date, name}]}` |
| PUT | /settings | settings.manage | `{cutoffTime?, cutoffWorkingDayCount? (>=0), businessTimezone?, kitchenReadyBufferMinutes?, atRiskWindowMinutes? (0-240)}` | PlatformSettings |
| PUT | /settings/working-days | settings.manage | `{days: DayOfWeek[]}` (at least 1, no duplicates) | `{dayOfWeek}[]` |
| GET / POST / DELETE | /settings/holidays, /settings/holidays/:id | read / manage | `{date, name?}` | holiday |

## Phase 0 checks

| Item | Exists? | Notes |
|---|---|---|
| Staff/user management routes | Yes (Hotfix B1) | `/staff`, `/roles` (staff.manage). |
| Employee CSV import | **No** | Assignment 4.x [Should]. No route. |
| List of drivers for assignment | Yes (Hotfix B1) | `GET /staff/drivers` (dispatch.assign_driver). |
| Business date/time endpoint | Yes (Hotfix B1) | `GET /business-time/now` for every signed-in user. CORS still does not expose the `Date` header, so use `serverNow` for the clock offset. |
| Dashboard fields | Yes | See the table above (extended in Hotfix B1). |
| Order search param | `search` | Matches orderNumber, employee name or company name (contains, case-insensitive). |
| Pagination shape | Yes | `{data, pagination:{page, pageSize, totalItems, totalPages}}`. Kitchen board, driver today and price tiers are not paginated. |
