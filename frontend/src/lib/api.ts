import { apiRequest } from "./api-client";

// ─── Shared ────────────────────────────────────────────────────────────────────

export type PaginatedResponse<T> = {
  data: T[];
  pagination: { page: number; pageSize: number; totalItems: number; totalPages: number };
};

/** Selector/table helper for paginated management lists: one page of the maximum size (100). */
async function listAll<T>(path: string): Promise<T[]> {
  const separator = path.includes("?") ? "&" : "?";
  return (await apiRequest<PaginatedResponse<T>>(`${path}${separator}pageSize=100`)).data;
}

// ─── Reference Data ─────────────────────────────────────────────────────────

export type NamedReference = { id: string; name: string; isActive: boolean };
export type OrderedReference = NamedReference & { displayOrder: number };

export const referenceDataApi = {
  allergens: () => listAll<NamedReference>("/allergens"),
  dietaryTags: () => listAll<NamedReference>("/dietary-tags"),
  kitchenStations: () => listAll<OrderedReference>("/kitchen-stations"),
  portionSizes: () => listAll<OrderedReference>("/portion-sizes"),
  packagingTypes: () => listAll<OrderedReference>("/packaging-types"),

  createAllergen: (body: { name: string }) =>
    apiRequest<NamedReference>("/allergens", { method: "POST", body: JSON.stringify(body) }),
  updateAllergen: (id: string, body: Partial<NamedReference>) =>
    apiRequest<NamedReference>(`/allergens/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  createDietaryTag: (body: { name: string }) =>
    apiRequest<NamedReference>("/dietary-tags", { method: "POST", body: JSON.stringify(body) }),
  updateDietaryTag: (id: string, body: Partial<NamedReference>) =>
    apiRequest<NamedReference>(`/dietary-tags/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  createKitchenStation: (body: { name: string; displayOrder: number }) =>
    apiRequest<OrderedReference>("/kitchen-stations", { method: "POST", body: JSON.stringify(body) }),
  updateKitchenStation: (id: string, body: Partial<OrderedReference>) =>
    apiRequest<OrderedReference>(`/kitchen-stations/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  createPackagingType: (body: { name: string; displayOrder: number }) =>
    apiRequest<OrderedReference>("/packaging-types", { method: "POST", body: JSON.stringify(body) }),
  updatePackagingType: (id: string, body: Partial<OrderedReference>) =>
    apiRequest<OrderedReference>(`/packaging-types/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  createPortionSize: (body: { name: string; displayOrder: number }) =>
    apiRequest<OrderedReference>("/portion-sizes", { method: "POST", body: JSON.stringify(body) }),
  updatePortionSize: (id: string, body: Partial<OrderedReference>) =>
    apiRequest<OrderedReference>(`/portion-sizes/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
};

// ─── Catalogue ──────────────────────────────────────────────────────────────

export type Dish = {
  id: string; name: string; description: string; imageUrl: string; sku: string;
  temperature: "HOT" | "COLD"; costCents: number; isActive: boolean;
  minimumOrderQuantity: number | null; station: OrderedReference | null;
  allergens: { allergen: NamedReference }[];
  dietaryTags: { dietaryTag: NamedReference }[];
  optionGroups: OptionGroup[];
};

export type OptionGroup = {
  id: string; name: string; isRequired: boolean; usesPortions: boolean; displayOrder: number;
  options: { optionId: string; displayOrder: number; option: Option }[];
  portions: { portionSizeId: string; extraChargeCents: number; displayOrder: number; portionSize: OrderedReference }[];
};

export type Option = {
  id: string; name: string; costCents: number; isActive: boolean;
  allergens: { allergen: NamedReference }[];
  dietaryTags: { dietaryTag: NamedReference }[];
};

export const catalogueApi = {
  listDishes: (params?: Record<string, string | number | boolean>) => {
    const qs = new URLSearchParams();
    if (params) Object.entries(params).forEach(([k, v]) => qs.set(k, String(v)));
    return apiRequest<PaginatedResponse<Dish>>(`/dishes?${qs}`);
  },
  getDish: (id: string) => apiRequest<Dish>(`/dishes/${id}`),
  deactivateDish: (id: string) => apiRequest<Dish>(`/dishes/${id}/deactivate`, { method: "POST" }),
  listOptions: () => listAll<Option>("/options"),
};

// ─── Menu ───────────────────────────────────────────────────────────────────

export type MenuCategory = {
  id: string; name: string; slug: string; displayOrder: number;
  isActive: boolean; isSecret: boolean;
  items: { dishId: string; displayOrder: number; dish: Pick<Dish, "id" | "name" | "sku" | "isActive"> }[];
  _count?: { items: number };
};

export const menuApi = {
  listCategories: () => listAll<MenuCategory>("/menu/categories"),
  getCategory: (id: string) => apiRequest<MenuCategory>(`/menu/categories/${id}`),
  createCategory: (body: { name: string; slug: string; displayOrder: number; isActive?: boolean; isSecret?: boolean }) =>
    apiRequest<MenuCategory>("/menu/categories", { method: "POST", body: JSON.stringify(body) }),
  updateCategory: (id: string, body: Partial<{ name: string; slug: string; displayOrder: number; isActive: boolean; isSecret: boolean }>) =>
    apiRequest<MenuCategory>(`/menu/categories/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  replaceItems: (categoryId: string, items: { dishId: string; displayOrder: number }[]) =>
    apiRequest<MenuCategory>(`/menu/categories/${categoryId}/items`, { method: "PUT", body: JSON.stringify({ items }) }),
};

// ─── Pricing ────────────────────────────────────────────────────────────────

export type PriceTier = {
  id: string; name: string; strategy: string; isActive: boolean; isDefault: boolean;
  sourceTierId: string | null; costMultiplierBps: number | null; sourceAdjustmentBps: number | null;
};

export const pricingApi = {
  listTiers: () => apiRequest<(PriceTier & { _count: { companies: number } })[]>("/price-tiers"),
  getTierEditor: (id: string) => apiRequest<{
    tier: PriceTier;
    dishes: { id: string; name: string; sku: string; costCents: number; isActive: boolean; overridePriceCents: number | null; priceCents: number | null; source: string }[];
    options: { id: string; name: string; costCents: number; isActive: boolean; overridePriceCents: number | null; priceCents: number | null; source: string }[];
  }>(`/price-tiers/${id}/editor`),
};

// ─── Companies ──────────────────────────────────────────────────────────────

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
  _count?: { employees: number };
};

/** Write payload for POST/PATCH /companies (validated server-side). */
export type CompanyWriteInput = {
  name: string; billingContactName: string; billingContactEmail: string; billingContactPhone?: string;
  defaultDeliveryTime: string; deliveryLeadMinutes: number; defaultPackagingTypeId: string;
  workingDays: string[]; domains: string[];
  addresses: Array<{ id?: string; label: string; line1: string; line2?: string; city: string; region?: string; postalCode?: string; country: string; isActive?: boolean }>;
  owner?: { name: string; email?: string; canChooseDeliveryAddress: boolean; canChangeDeliveryTime: boolean; canChangePackaging: boolean; allergenIds: string[]; dietaryTagIds: string[] };
  holidays?: Array<{ date: string; name?: string }>;
  hiddenCategoryIds?: string[];
  hiddenDishIds?: string[];
};

export const companiesApi = {
  list: (params?: { page?: number; pageSize?: number; search?: string }) => {
    const qs = new URLSearchParams();
    if (params?.page) qs.set("page", String(params.page));
    if (params?.pageSize) qs.set("pageSize", String(params.pageSize));
    if (params?.search) qs.set("search", params.search);
    return apiRequest<PaginatedResponse<Company>>(`/companies?${qs}`);
  },
  get: (id: string) => apiRequest<Company>(`/companies/${id}`),
  create: (body: CompanyWriteInput) => apiRequest<Company>("/companies", { method: "POST", body: JSON.stringify(body) }),
  update: (id: string, body: Partial<CompanyWriteInput>) => apiRequest<Company>(`/companies/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
};

// ─── Employees ──────────────────────────────────────────────────────────────

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
  canChooseDeliveryAddress?: boolean; canChangeDeliveryTime?: boolean; canChangePackaging?: boolean;
  allergenIds?: string[]; dietaryTagIds?: string[];
};

export const employeesApi = {
  list: (params?: { page?: number; pageSize?: number; search?: string; companyId?: string }) => {
    const qs = new URLSearchParams();
    if (params?.page) qs.set("page", String(params.page));
    if (params?.pageSize) qs.set("pageSize", String(params.pageSize));
    if (params?.search) qs.set("search", params.search);
    if (params?.companyId) qs.set("companyId", params.companyId);
    return apiRequest<PaginatedResponse<Employee>>(`/employees?${qs}`);
  },
  get: (id: string) => apiRequest<Employee>(`/employees/${id}`),
  create: (companyId: string, body: EmployeeWriteInput) => apiRequest<Employee>(`/companies/${companyId}/employees`, { method: "POST", body: JSON.stringify(body) }),
  update: (id: string, body: Partial<EmployeeWriteInput>) => apiRequest<Employee>(`/employees/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  menuPreview: (id: string) => apiRequest<{
    employee: { id: string; name: string; companyId: string }; tierId: string;
    categories: {
      id: string; name: string; slug: string; dishes: {
        id: string; name: string; resolvedPriceCents: number; priceSource: string;
        allergens: { allergen: NamedReference }[]; dietaryTags: { dietaryTag: NamedReference }[];
        optionGroups: { id: string; name: string; isRequired: boolean; options: { id: string; name: string; resolvedPriceCents: number }[] }[];
        preferenceContext: { allergenWarnings: NamedReference[]; matchingDietaryTags: NamedReference[] };
      }[];
    }[];
  }>(`/employees/${id}/menu-preview`),
};

// ─── Settings ───────────────────────────────────────────────────────────────

export type PlatformSettings = {
  id: number; businessTimezone: string; cutoffTime: string;
  cutoffWorkingDayCount: number; kitchenReadyBufferMinutes: number; atRiskWindowMinutes: number;
};

export const settingsApi = {
  get: () => apiRequest<{
    settings: PlatformSettings;
    workingDays: string[];
    holidays: { id: string; date: string; name: string | null }[];
  }>("/settings"),
  update: (body: Partial<{ cutoffTime: string; cutoffWorkingDayCount: number; businessTimezone: string; kitchenReadyBufferMinutes: number; atRiskWindowMinutes: number }>) =>
    apiRequest<PlatformSettings>("/settings", { method: "PUT", body: JSON.stringify(body) }),
  upsertWorkingDays: (days: string[]) =>
    apiRequest<{ dayOfWeek: string }[]>("/settings/working-days", { method: "PUT", body: JSON.stringify({ days }) }),
  createHoliday: (body: { date: string; name?: string }) =>
    apiRequest<{ id: string; date: string; name: string | null }>("/settings/holidays", { method: "POST", body: JSON.stringify(body) }),
  deleteHoliday: (id: string) =>
    apiRequest<void>(`/settings/holidays/${id}`, { method: "DELETE" }),
};

// ─── Delivery Drops (Dispatch & Driver) ─────────────────────────────────────

/** Backend enum values; display with DROP_STATUS_LABEL (e.g. "Out for Delivery"). */
export type DeliveryDropStatus = "DISPATCH_READY" | "OUT_FOR_DELIVERY" | "DELIVERED";

export const DROP_STATUS_LABEL: Record<DeliveryDropStatus, string> = {
  DISPATCH_READY: "Dispatch Ready",
  OUT_FOR_DELIVERY: "Out for Delivery",
  DELIVERED: "Delivered",
};

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

export type DispatchDrop = DeliveryDrop & { company: { name: string }; driver: { name: string } | null };
export type DriverDrop = DeliveryDrop & { company: { name: string; driverInstructions: string | null } };

export const dispatchApi = {
  list: (date: string) => apiRequest<PaginatedResponse<DispatchDrop>>(`/dispatch/drops?date=${encodeURIComponent(date)}&pageSize=100`),
  reconcile: () => apiRequest<{ processedGroups: number; unattachedReadyOrdersFound: number; failures: { key: string; message: string }[] }>("/dispatch/drops/reconcile", { method: "POST" }),
  assignDriver: (dropId: string, driverId: string) =>
    apiRequest<DeliveryDrop>(`/dispatch/drops/${dropId}/assign-driver`, { method: "POST", body: JSON.stringify({ driverId }) }),
  outForDelivery: (dropId: string) => apiRequest<DeliveryDrop>(`/dispatch/drops/${dropId}/out-for-delivery`, { method: "POST" }),
  proofUrl: (dropId: string) => apiRequest<{ url: string; expiresInSeconds: number }>(`/dispatch/drops/${dropId}/proof-url`),
};

export const driverApi = {
  today: () => apiRequest<{ businessDate: string; data: DriverDrop[] }>("/driver/drops/today"),
  /** Photo is optional; note-only delivery is supported. */
  deliver: (dropId: string, input: { note?: string; photo?: File | null }) => {
    const body = new FormData();
    if (input.note?.trim()) body.append("note", input.note.trim());
    if (input.photo) body.append("photo", input.photo);
    return apiRequest<DeliveryDrop>(`/driver/drops/${dropId}/deliver`, { method: "POST", body });
  },
};

// ─── Billing ────────────────────────────────────────────────────────────────

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

export const billingApi = {
  listInvoices: () => apiRequest<PaginatedResponse<InvoiceSummary>>("/invoices?pageSize=100"),
  getInvoice: async (id: string) => (await apiRequest<{ data: InvoiceDetail }>(`/invoices/${id}`)).data,
  markPaid: (id: string) => apiRequest<Invoice>(`/invoices/${id}/pay`, { method: "POST" }),
  uninvoiced: (companyId: string) =>
    apiRequest<PaginatedResponse<UninvoicedOrder> & { totalUninvoicedCents: number }>(`/companies/${companyId}/billing/uninvoiced?pageSize=100`),
  createInvoice: async (companyId: string, orderIds: string[]) =>
    (await apiRequest<{ data: Invoice }>("/invoices", { method: "POST", body: JSON.stringify({ companyId, orderIds }) })).data,
};

// ─── Dashboards (backend-authoritative metrics) ─────────────────────────────

type DashboardEnvelope<M> = { businessDate: string; metrics: M };
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

export const dashboardApi = {
  admin: () => apiRequest<AdminDashboardData>("/dashboard/admin"),
  kitchen: () => apiRequest<KitchenDashboardData>("/dashboard/kitchen"),
  dispatch: () => apiRequest<DispatchDashboardData>("/dashboard/dispatch"),
  driver: () => apiRequest<DriverDashboardData>("/dashboard/driver"),
};
