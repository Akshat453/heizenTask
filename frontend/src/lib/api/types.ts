/** Response and request types matching the NestJS DTOs (see docs/API_MAP.md). */

export type PaginatedResponse<T> = {
  data: T[];
  pagination: { page: number; pageSize: number; totalItems: number; totalPages: number };
};

export type NamedReference = { id: string; name: string; isActive: boolean };

export type OrderedReference = NamedReference & { displayOrder: number };

export type Dish = {
  id: string; name: string; description: string; imageUrl: string; sku: string;
  temperature: "HOT" | "COLD"; costCents: number; isActive: boolean;
  minimumOrderQuantity: number | null; station: OrderedReference | null;
  allergens: { allergen: NamedReference }[];
  dietaryTags: { dietaryTag: NamedReference }[];
  optionGroups: OptionGroup[];
  updatedAt?: string;
};

export type OptionGroup = {
  id: string; name: string; isRequired: boolean; usesPortions: boolean; displayOrder: number;
  options: { optionId: string; displayOrder: number; option: Option }[];
  portions: { portionSizeId: string; extraChargeCents: number; displayOrder: number; portionSize: OrderedReference }[];
};

/** Dish list rows: no option groups (they come with GET /dishes/:id). */
export type DishListItem = Omit<Dish, "optionGroups">;

export type Option = {
  id: string; name: string; costCents: number; isActive: boolean; updatedAt?: string;
  allergens: { allergen: NamedReference }[];
  dietaryTags: { dietaryTag: NamedReference }[];
};

/** List rows (GET /menu/categories) carry only the item count. */
export type MenuCategorySummary = {
  id: string; name: string; slug: string; displayOrder: number;
  isActive: boolean; isSecret: boolean;
  _count: { items: number };
  hiddenCompanyCount: number;
};

/** GET /menu/categories/:id */
export type MenuCategory = {
  id: string; name: string; slug: string; displayOrder: number;
  isActive: boolean; isSecret: boolean;
  /** Companies hiding this category. */
  hiddenByCompanyIds: string[];
  items: { dishId: string; displayOrder: number; isActive: boolean; dish: Pick<Dish, "id" | "name" | "sku" | "isActive">; hiddenByCompanyIds: string[] }[];
  _count?: { items: number };
};

export type PriceTierStrategy = "MANUAL" | "COST_MULTIPLIER" | "TIER_PERCENTAGE";

export type PriceTier = {
  id: string; name: string; strategy: PriceTierStrategy; isActive: boolean; isDefault: boolean;
  sourceTierId: string | null; costMultiplierBps: number | null; sourceAdjustmentBps: number | null;
};

export type DayOfWeek = "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY" | "SATURDAY" | "SUNDAY";

export type CompanyAddress = {
  id: string; label: string; line1: string; line2: string | null; city: string; region: string | null;
  postalCode: string | null; country: string; isActive: boolean;
};

export type Company = {
  id: string; name: string;
  billingContactName: string; billingContactEmail: string; billingContactPhone: string | null;
  /** Postgres TIME serialized as 1970-01-01T<HH:mm>:00.000Z (business-local wall clock). */
  defaultDeliveryTime: string;
  deliveryLeadMinutes: number;
  defaultPackagingTypeId: string;
  driverInstructions: string | null;
  ownerEmployee: { id: string; name: string; email: string | null } | null;
  priceTier: PriceTier | null;
  domains: { domain: string }[];
  addresses: CompanyAddress[];
  workingDays?: { dayOfWeek: DayOfWeek }[];
  _count?: { employees: number; addresses?: number };
  updatedAt?: string;
};

export type AddressInput = {
  id?: string; label: string; line1: string; line2?: string | null; city: string;
  region?: string | null; postalCode?: string | null; country: string; isActive?: boolean;
};
export type HolidayInput = { id?: string; date: string; name?: string | null };
export type OwnerInput = {
  name: string; email?: string | null; canChooseDeliveryAddress?: boolean; canChangeDeliveryTime?: boolean;
  canChangePackaging?: boolean; allergenIds: string[]; dietaryTagIds: string[];
};

/** POST /companies: the owner is created as the company's first employee in the same request. */
export type CompanyCreateInput = {
  name: string; billingContactName: string; billingContactEmail: string; billingContactPhone?: string | null;
  domains: string[]; addresses: AddressInput[]; owner: OwnerInput;
  priceTierId?: string | null; defaultDeliveryTime: string; deliveryLeadMinutes: number;
  defaultPackagingTypeId: string; driverInstructions?: string | null; defaultDriverStaffUserId?: string | null;
  workingDays: DayOfWeek[]; holidays: HolidayInput[]; hiddenCategoryIds: string[]; hiddenDishIds: string[];
};

/** PATCH /companies/:id: omitted fields are kept; arrays replace the whole set (omitted addresses are deactivated). */
export type CompanyUpdateInput = Partial<Omit<CompanyCreateInput, "owner">> & { ownerEmployeeId?: string };

/** @deprecated legacy alias used by the old company form. */
export type CompanyWriteInput = CompanyCreateInput;

export type Employee = {
  id: string; name: string; email: string | null;
  company: { id: string; name: string };
  canChooseDeliveryAddress: boolean; canChangeDeliveryTime: boolean; canChangePackaging: boolean;
  defaultDeliveryAddress: { id: string; label: string } | null;
  allergens: { allergen: NamedReference }[];
  dietaryTags: { dietaryTag: NamedReference }[];
  ownedCompany: { id: string; name: string } | null;
};

/** Write payload for employee create/update (validated server-side). */
export type EmployeeWriteInput = {
  name: string; email?: string | null; defaultDeliveryAddressId?: string | null;
  /** Update only: moves the employee to another company. */
  companyId?: string;
  canChooseDeliveryAddress?: boolean; canChangeDeliveryTime?: boolean; canChangePackaging?: boolean;
  allergenIds?: string[]; dietaryTagIds?: string[];
};

export type PlatformSettings = {
  id: number; businessTimezone: string; cutoffTime: string;
  cutoffWorkingDayCount: number; kitchenReadyBufferMinutes: number; atRiskWindowMinutes: number;
};

/** Backend enum values; display with DROP_STATUS_LABEL (e.g. "Out for Delivery"). */
export type DeliveryDropStatus = "DISPATCH_READY" | "OUT_FOR_DELIVERY" | "DELIVERED";

export type DeliveryDrop = {
  id: string; companyId: string; status: DeliveryDropStatus;
  scheduledDeliveryAt: string;
  addressLabelSnapshot: string; addressLine1Snapshot: string; addressLine2Snapshot: string | null;
  addressCitySnapshot: string; addressRegionSnapshot: string | null; addressPostalCodeSnapshot: string | null;
  addressCountrySnapshot: string;
  driverStaffUserId: string | null;
  dispatchReadyAt: string | null; outForDeliveryAt: string | null; deliveredAt: string | null;
  deliveryNote: string | null;
  /** Private storage key of the proof photo (view via the proof-url endpoint). */
  photoUrl: string | null;
  /** null before delivery; deliveredAt <= scheduledDeliveryAt afterwards. */
  onTime: boolean | null;
  _count: { orders: number };
};

/** Orders, meals and packaging loaded with each drop (dispatch list and driver route). */
export type DropOrderSummary = { id: string; orderNumber: string; employeeName: string; packagingName: string; meals: number };
export type DropContents = { orders: DropOrderSummary[]; meals: number; packaging: { name: string; count: number }[] };

export type DispatchDrop = DeliveryDrop & DropContents & {
  company: { name: string }; driver: { name: string } | null;
  /** scheduledDeliveryAt − the longest lead snapshotted on the drop's orders (computed by the API). */
  plannedDispatchReadyAt: string | null;
};

export type DriverDrop = DeliveryDrop & DropContents & { company: { name: string; driverInstructions: string | null } };

export type InvoiceStatus = "UNPAID" | "PAID";

export type OrderStatus = "DRAFT" | "PLACED" | "CONFIRMED" | "CANCELLED" | "REJECTED" | "DELIVERED";

export type Invoice = {
  id: string; invoiceNumber: string; companyId: string; status: InvoiceStatus;
  totalCents: number; createdAt: string; paidAt: string | null;
};

export type InvoiceSummary = Invoice & { company: { name: string }; _count: { orders: number } };

export type InvoiceDetail = Invoice & {
  company: { name: string; billingContactName: string; billingContactEmail: string };
  orders: {
    invoiceId: string; orderId: string; amountCents: number;
    order: { orderNumber: string; status: OrderStatus; deliveryDate: string; employee: { name: string } };
  }[];
};

export type UninvoicedOrder = {
  id: string; orderNumber: string; status: OrderStatus; deliveryDate: string; deliveryAt: string;
  billableTotalCents: number; confirmedAt: string | null; cancelledAt: string | null;
  employee: { name: string; email: string | null };
};

export type DashboardEnvelope<M> = { businessDate: string; metrics: M };

export type AdminDashboardData = DashboardEnvelope<{
  todayOrders: number; todayBillableCents: number; uninvoicedCents: number;
  lateKitchenOrders: number; latePrepUnits: number; activeDeliveries: number;
}>;

export type KitchenDashboardData = DashboardEnvelope<{
  notStarted: number; started: number; atRisk: number; late: number;
  nextDeadline: { plannedKitchenReadyAt: string; orderId: string; orderNumber: string; companyName: string; remainingUnits: number } | null;
}>;

export type DispatchDashboardData = DashboardEnvelope<{ dispatchReady: number; unassigned: number; outForDelivery: number; lateDeliveries: number }>;

export type DriverDashboardData = DashboardEnvelope<{
  todayDrops: number; remaining: number; delivered: number;
  nextDrop: { id: string; scheduledDeliveryAt: string; companyName: string; addressCitySnapshot: string; status: DeliveryDropStatus } | null;
}>;

// ─── Kitchen board ───────────────────────────────────────────────────────────

export type KitchenPrepState = "NOT_STARTED" | "STARTED" | "DONE";
export type KitchenTimingState = "ON_TRACK" | "AT_RISK" | "LATE" | "COMPLETE";

/** One prep unit row from GET /kitchen?date= (unpaginated, unfinished first, then by deadline). */
export type KitchenBoardUnit = {
  id: string;
  orderId: string;
  orderNumber: string;
  companyName: string;
  employeeName: string;
  deliveryDate: string;
  deliveryAt: string;
  plannedKitchenReadyAt: string;
  dishNameSnapshot: string;
  quantity: number;
  stationId: string | null;
  stationNameSnapshot: string;
  options: { optionGroupNameSnapshot: string; optionNameSnapshot: string; portionNameSnapshot: string | null }[];
  startedAt: string | null;
  doneAt: string | null;
  prepState: KitchenPrepState;
  timingState: KitchenTimingState;
};

// ─── Orders / cut-off ────────────────────────────────────────────────────────

export type OrderListItem = {
  id: string; orderNumber: string; status: OrderStatus;
  deliveryDate: string; deliveryAt: string;
  /** Scalar Order fields also present on list rows. */
  deliveryDropId: string | null; kitchenReadyAt: string | null; kitchenStartedAt: string | null;
  deliveryAddressId: string | null; deliveryAddressLabelSnapshot: string; packagingNameSnapshot: string;
  companyId: string; employeeId: string;
  totalCents: number; billableTotalCents: number | null;
  employee: { name: string }; company: { name: string };
  invoiceOrder: { invoiceId: string; amountCents: number } | null;
};

export type OrderListQuery = {
  page?: number; pageSize?: number; search?: string; status?: OrderStatus; companyId?: string;
  deliveryDateFrom?: string; deliveryDateTo?: string;
  invoiced?: boolean;
  deliveryDropId?: string;
};

/** GET /business-time/cutoff/:date */
export type CutoffInfo = { deliveryDate: string; cutoffInstant: string; passed: boolean; cutoffDate: string };

/** POST /orders/cutoff/process */
export type CutoffSummary = {
  processedCount: number; cancelledCount: number; confirmedCount: number; skippedCount: number;
  failures: { orderId: string; message: string }[];
};

// ─── Order detail / write ────────────────────────────────────────────────────

export type OrderEventType =
  | "ORDER_CREATED" | "ORDER_PLACED" | "ORDER_CONFIRMED" | "ORDER_REJECTED" | "ORDER_CANCELLED"
  | "DELIVERY_DETAILS_CHANGED" | "KITCHEN_STARTED" | "KITCHEN_READY" | "DISPATCH_READY"
  | "OUT_FOR_DELIVERY" | "DELIVERED";

/** A {from, to} change inside DELIVERY_DETAILS_CHANGED metadata. */
export type FieldChange = { from: string | null; to: string | null };

/**
 * Event metadata is free-form JSON. DELIVERY_DETAILS_CHANGED uses
 * { deliveryAddressId?, deliveryAt?, packagingTypeId? } each as FieldChange; narrow with isFieldChange.
 */
export type OrderEvent = {
  id: string; type: OrderEventType; occurredAt: string; message: string | null;
  metadata: Record<string, unknown> | null;
  actor: { name: string } | null;
};

export type OrderCombinationOptionSnapshot = {
  id: string; optionGroupId: string; optionId: string; portionSizeId: string | null;
  optionGroupNameSnapshot: string; optionNameSnapshot: string; portionNameSnapshot: string | null;
  optionPriceCents: number; portionExtraCents: number;
};

export type OrderLineSnapshot = {
  id: string; dishId: string; dishNameSnapshot: string; dishSkuSnapshot: string;
  quantity: number; dishUnitPriceCents: number; lineTotalCents: number;
  combinations: { id: string; quantity: number; unitPriceCents: number; totalCents: number; options: OrderCombinationOptionSnapshot[] }[];
};

export type OrderDetail = {
  id: string; orderNumber: string; status: OrderStatus;
  employeeId: string; companyId: string;
  deliveryDate: string; deliveryAt: string;
  deliveryAddressId: string | null;
  deliveryAddressLabelSnapshot: string; deliveryAddressLine1Snapshot: string; deliveryAddressLine2Snapshot: string | null;
  deliveryAddressCitySnapshot: string; deliveryAddressRegionSnapshot: string | null;
  deliveryAddressPostalCodeSnapshot: string | null; deliveryAddressCountrySnapshot: string;
  packagingTypeId: string; packagingNameSnapshot: string; deliveryLeadMinutesSnapshot: number;
  subtotalCents: number; totalCents: number; billableTotalCents: number | null;
  placedAt: string | null; confirmedAt: string | null; cancelledAt: string | null; rejectedAt: string | null;
  rejectionReason: string | null; kitchenStartedAt: string | null; kitchenReadyAt: string | null;
  deliveryDropId: string | null; createdByStaffUserId: string; createdAt: string; updatedAt: string;
  employee: { id: string; name: string; email: string | null };
  company: { id: string; name: string };
  lines: OrderLineSnapshot[];
  events: OrderEvent[];
  invoiceOrder: { invoiceId: string; amountCents: number } | null;
};

export type OrderLineInput = {
  dishId: string;
  quantity: number;
  combinations: { quantity: number; options: { optionGroupId: string; optionId: string; portionSizeId?: string }[] }[];
};

export type DeliveryChoicesInput = { deliveryAddressId?: string; deliveryTime?: string; packagingTypeId?: string };
export type CreateOrderInput = DeliveryChoicesInput & { employeeId: string; deliveryDate: string; placeOrder: boolean; lines: OrderLineInput[] };
export type UpdateOrderInput = DeliveryChoicesInput & { placeOrder?: boolean; lines?: OrderLineInput[] };
/** Admin override after confirmation; deliveryAt must carry an explicit offset. */
export type OverrideDeliveryInput = { deliveryAddressId?: string; deliveryAt?: string; packagingTypeId?: string };

// ─── Menu preview ────────────────────────────────────────────────────────────

export type MenuPreviewOption = { id: string; name: string; isActive: boolean; resolvedPriceCents: number; priceSource: string };
export type MenuPreviewPortion = { id: string; name: string; displayOrder: number; extraChargeCents: number };
export type MenuPreviewGroup = {
  id: string; name: string; isRequired: boolean; usesPortions: boolean; displayOrder: number;
  options: MenuPreviewOption[]; portions: MenuPreviewPortion[];
};
export type MenuPreviewDish = {
  id: string; name: string; description: string; imageUrl: string; sku: string;
  temperature: "HOT" | "COLD"; minimumOrderQuantity: number | null;
  allergens: { allergen: NamedReference }[]; dietaryTags: { dietaryTag: NamedReference }[];
  displayOrder: number; resolvedPriceCents: number; priceSource: string;
  optionGroups: MenuPreviewGroup[];
  preferenceContext: { allergenWarnings: { id: string; name: string }[]; matchingDietaryTags: { id: string; name: string }[] };
};
export type MenuPreview = {
  employee: { id: string; name: string; companyId: string };
  tierId: string;
  preferences: { allergens: NamedReference[]; dietaryTags: NamedReference[]; blocking: false };
  categories: { id: string; name: string; slug: string; displayOrder: number; isSecret: boolean; dishes: MenuPreviewDish[] }[];
  /** Only on the full preview (not on a single category opened by slug). */
  rules?: PreviewRules;
};

export type CompanyDetail = Company & {
  holidays: { id: string; date: string; name: string | null }[];
  workingDays: { dayOfWeek: DayOfWeek }[];
  defaultPackagingType: OrderedReference;
  defaultDriver: { id: string; name: string; email: string } | null;
  hiddenCategories: { categoryId: string; category: { id: string; name: string } }[];
  hiddenDishes: { dishId: string; dish: { id: string; name: string; sku: string } }[];
};

export function isFieldChange(value: unknown): value is FieldChange {
  return typeof value === "object" && value !== null && "from" in value && "to" in value;
}

// ─── Staff ───────────────────────────────────────────────────────────────────

export type DriverOption = { id: string; name: string; email: string };
export type ReconcileResult = { processedGroups: number; unattachedReadyOrdersFound: number; failures: { key: string; message: string }[] };

export type DropListQuery = { date: string; search?: string; driverId?: string; page?: number; pageSize?: number };

// ─── Catalogue / pricing writes ──────────────────────────────────────────────

export type OptionGroupInput = {
  id?: string; name: string; isRequired: boolean; usesPortions: boolean; displayOrder: number;
  options: { optionId: string; displayOrder: number }[];
  portions: { portionSizeId: string; extraChargeCents: number; displayOrder: number }[];
};

export type DishWriteInput = {
  name: string; description: string; imageUrl: string; sku: string; temperature: "HOT" | "COLD";
  costCents: number; minimumOrderQuantity?: number | null; stationId?: string | null; isActive?: boolean;
  allergenIds: string[]; dietaryTagIds: string[]; optionGroups: OptionGroupInput[];
};

export type OptionWriteInput = { name: string; costCents: number; isActive?: boolean; allergenIds: string[]; dietaryTagIds: string[] };

export type PriceTierWriteInput = {
  name: string; strategy: PriceTierStrategy; isDefault?: boolean; isActive?: boolean;
  sourceTierId?: string | null; costMultiplierBps?: number | null; sourceAdjustmentBps?: number | null;
};

export type PriceSource = "OVERRIDE" | "MANUAL" | "COST_MULTIPLIER" | "TIER_PERCENTAGE" | "MISSING" | string;
/** overrideCents: typed override; derivedCents: the tier formula ignoring that override (null for MANUAL or underivable); effectiveCents: what new orders use. */
export type TierEditorRow = {
  id: string; name: string; costCents: number; isActive: boolean;
  overrideCents: number | null; derivedCents: number | null; effectiveCents: number | null; source: PriceSource; sku?: string;
};
export type TierEditor = { tier: PriceTier; dishes: (TierEditorRow & { sku: string })[]; options: TierEditorRow[] };
export type PriceOverride = { itemId: string; priceCents: number | null };

export type PriceTierListItem = PriceTier & { _count: { companies: number }; missingDishCount: number | null; missingOptionCount: number | null };
export type ItemTierPrice = { tierId: string; tierName: string; isDefault: boolean; isActive: boolean; effectiveCents: number | null; source: "OVERRIDE" | "DERIVED" | "MISSING" };
export type PreviewRules = { tierId: string; tierName: string | null; usedDefaultTier: boolean; hiddenCategoryCount: number; hiddenDishCount: number; unpricedDishCount: number };

export type StaffMember = {
  id: string; name: string; email: string; isActive: boolean; createdAt: string; updatedAt: string;
  role: { id: string; name: string };
};

export type StaffRole = { id: string; name: string; description: string | null; permissions: string[] };

export type StaffCreateInput = { name: string; email: string; roleId: string; password: string };
export type StaffUpdateInput = Partial<{ name: string; roleId: string; isActive: boolean }>;
