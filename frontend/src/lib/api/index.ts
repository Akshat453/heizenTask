import { apiRequest } from "@/lib/api-client";
import type {
  PaginatedResponse,
  NamedReference,
  OrderedReference,
  Dish,
  Option,
  MenuCategory,
  MenuCategorySummary,
  DishListItem,
  PriceTier,
  Company,
  CompanyCreateInput,
  InvoiceStatus,
  DayOfWeek,
  StaffMember,
  StaffRole,
  StaffCreateInput,
  StaffUpdateInput,
  CompanyUpdateInput,
  Employee,
  EmployeeWriteInput,
  PlatformSettings,
  DeliveryDropStatus,
  DeliveryDrop,
  DispatchDrop,
  DriverDrop,
  Invoice,
  InvoiceSummary,
  InvoiceDetail,
  UninvoicedOrder,
  AdminDashboardData,
  KitchenDashboardData,
  DispatchDashboardData,
  DriverDashboardData,
  KitchenBoardUnit,
  OrderListItem,
  OrderListQuery,
  CutoffInfo,
  CutoffSummary,
  OrderDetail,
  CreateOrderInput,
  UpdateOrderInput,
  OverrideDeliveryInput,
  MenuPreview,
  CompanyDetail,
  DriverOption,
  ReconcileResult,
  DropListQuery,
  DishWriteInput,
  OptionWriteInput,
  PriceTierWriteInput,
  TierEditor,
  PriceOverride,
  PriceTierListItem,
  ItemTierPrice,
} from "./types";

export * from "./types";

// ─── Shared ────────────────────────────────────────────────────────────────────

/** Selector/table helper for paginated management lists: one page of the maximum size (100). */
async function listAll<T>(path: string): Promise<T[]> {
  const separator = path.includes("?") ? "&" : "?";
  return (await apiRequest<PaginatedResponse<T>>(`${path}${separator}pageSize=100`)).data;
}

// ─── Reference Data ─────────────────────────────────────────────────────────

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

export const catalogueApi = {
  listDishes: (params: { page?: number; pageSize?: number; search?: string; isActive?: boolean; temperature?: "HOT" | "COLD"; stationId?: string; dietaryTagId?: string } = {}) =>
    apiRequest<PaginatedResponse<DishListItem>>(`/dishes?${toQuery(params)}`),
  getDish: (id: string) => apiRequest<Dish>(`/dishes/${id}`),
  createDish: (body: DishWriteInput) => apiRequest<Dish>("/dishes", { method: "POST", body: JSON.stringify(body) }),
  updateDish: (id: string, body: Partial<DishWriteInput>) => apiRequest<Dish>(`/dishes/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  deactivateDish: (id: string) => apiRequest<Dish>(`/dishes/${id}/deactivate`, { method: "POST" }),
  /** Reactivation is a normal update (isActive is part of the dish DTO). */
  reactivateDish: (id: string) => apiRequest<Dish>(`/dishes/${id}`, { method: "PATCH", body: JSON.stringify({ isActive: true }) }),
  listOptions: () => listAll<Option>("/options"),
  searchOptions: (params: { page?: number; pageSize?: number; search?: string; isActive?: boolean } = {}) =>
    apiRequest<PaginatedResponse<Option>>(`/options?${toQuery(params)}`),
  dishPrices: (id: string) => apiRequest<ItemTierPrice[]>(`/dishes/${id}/prices`),
  optionPrices: (id: string) => apiRequest<ItemTierPrice[]>(`/options/${id}/prices`),
  getOption: (id: string) => apiRequest<Option>(`/options/${id}`),
  createOption: (body: OptionWriteInput) => apiRequest<Option>("/options", { method: "POST", body: JSON.stringify(body) }),
  updateOption: (id: string, body: Partial<OptionWriteInput>) => apiRequest<Option>(`/options/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
};

// ─── Menu ───────────────────────────────────────────────────────────────────

export const menuApi = {
  listCategories: () => listAll<MenuCategorySummary>("/menu/categories"),
  getCategory: (id: string) => apiRequest<MenuCategory>(`/menu/categories/${id}`),
  createCategory: (body: { name: string; slug: string; displayOrder: number; isActive?: boolean; isSecret?: boolean }) =>
    apiRequest<MenuCategory>("/menu/categories", { method: "POST", body: JSON.stringify(body) }),
  updateCategory: (id: string, body: Partial<{ name: string; slug: string; displayOrder: number; isActive: boolean; isSecret: boolean }>) =>
    apiRequest<MenuCategory>(`/menu/categories/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  /** Replaces the whole ordered item list in one request. */
  /** Replaces the full set of companies hiding the category (one transaction). */
  setCategoryHiding: (categoryId: string, companyIds: string[]) =>
    apiRequest<{ categoryId: string; hiddenByCompanyIds: string[] }>(`/menu/categories/${categoryId}/hidden-companies`, { method: "PUT", body: JSON.stringify({ companyIds }) }),
  /** Replaces the full set of companies hiding the dish on every menu. */
  setDishHiding: (dishId: string, companyIds: string[]) =>
    apiRequest<{ dishId: string; hiddenByCompanyIds: string[] }>(`/menu/dishes/${dishId}/hidden-companies`, { method: "PUT", body: JSON.stringify({ companyIds }) }),
  replaceItems: (categoryId: string, items: { dishId: string; displayOrder: number; isActive: boolean }[]) =>
    apiRequest<MenuCategory>(`/menu/categories/${categoryId}/items`, { method: "PUT", body: JSON.stringify({ items }) }),
};

// ─── Pricing ────────────────────────────────────────────────────────────────

export const pricingApi = {
  listTiers: () => apiRequest<PriceTierListItem[]>("/price-tiers"),
  getTier: (id: string) => apiRequest<PriceTier>(`/price-tiers/${id}`),
  createTier: (body: PriceTierWriteInput) => apiRequest<PriceTier>("/price-tiers", { method: "POST", body: JSON.stringify(body) }),
  updateTier: (id: string, body: Partial<PriceTierWriteInput>) => apiRequest<PriceTier>(`/price-tiers/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  getTierEditor: (id: string) => apiRequest<TierEditor>(`/price-tiers/${id}/editor`),
  /** One request for every change; priceCents null clears an override. */
  updatePrices: (id: string, body: { dishOverrides: PriceOverride[]; optionOverrides: PriceOverride[] }) =>
    apiRequest<{ success: true }>(`/price-tiers/${id}/prices`, { method: "PATCH", body: JSON.stringify(body) }),
};

// ─── Companies ──────────────────────────────────────────────────────────────

export const companiesApi = {
  list: (params?: { page?: number; pageSize?: number; search?: string }) => {
    const qs = new URLSearchParams();
    if (params?.page) qs.set("page", String(params.page));
    if (params?.pageSize) qs.set("pageSize", String(params.pageSize));
    if (params?.search) qs.set("search", params.search);
    return apiRequest<PaginatedResponse<Company>>(`/companies?${qs}`);
  },
  get: (id: string) => apiRequest<CompanyDetail>(`/companies/${id}`),
  create: (body: CompanyCreateInput) => apiRequest<CompanyDetail>("/companies", { method: "POST", body: JSON.stringify(body) }),
  update: (id: string, body: CompanyUpdateInput) => apiRequest<CompanyDetail>(`/companies/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
};

// ─── Employees ──────────────────────────────────────────────────────────────

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
  menuPreview: (id: string) => apiRequest<MenuPreview>(`/employees/${id}/menu-preview`),
  /** Direct access to one category by slug (the only way to reach a secret category). */
  menuPreviewCategory: (id: string, slug: string) => apiRequest<MenuPreview>(`/employees/${id}/menu-preview/categories/${encodeURIComponent(slug)}`),
};

// ─── Settings ───────────────────────────────────────────────────────────────

export const settingsApi = {
  get: () => apiRequest<{
    settings: PlatformSettings;
    workingDays: DayOfWeek[];
    holidays: { id: string; date: string; name: string | null }[];
  }>("/settings"),
  update: (body: Partial<{ cutoffTime: string; cutoffWorkingDayCount: number; businessTimezone: string; kitchenReadyBufferMinutes: number; atRiskWindowMinutes: number }>) =>
    apiRequest<PlatformSettings>("/settings", { method: "PUT", body: JSON.stringify(body) }),
  upsertWorkingDays: (days: DayOfWeek[]) =>
    apiRequest<{ dayOfWeek: string }[]>("/settings/working-days", { method: "PUT", body: JSON.stringify({ days }) }),
  createHoliday: (body: { date: string; name?: string }) =>
    apiRequest<{ id: string; date: string; name: string | null }>("/settings/holidays", { method: "POST", body: JSON.stringify(body) }),
  deleteHoliday: (id: string) =>
    apiRequest<void>(`/settings/holidays/${id}`, { method: "DELETE" }),
};

// ─── Delivery Drops (Dispatch & Driver) ─────────────────────────────────────

export const DROP_STATUS_LABEL: Record<DeliveryDropStatus, string> = {
  DISPATCH_READY: "Dispatch Ready",
  OUT_FOR_DELIVERY: "Out for Delivery",
  DELIVERED: "Delivered",
};

export const dispatchApi = {
  /** search: company, address or driver; driverId: a staff id or "none". Filters apply before pagination. */
  list: (query: DropListQuery | string) => {
    const q = typeof query === "string" ? { date: query, pageSize: 100 } : { pageSize: 100, ...query };
    return apiRequest<PaginatedResponse<DispatchDrop>>(`/dispatch/drops?${toQuery(q)}`);
  },
  reconcile: () => apiRequest<ReconcileResult>("/dispatch/drops/reconcile", { method: "POST" }),
  assignDriver: (dropId: string, driverId: string) =>
    apiRequest<DeliveryDrop>(`/dispatch/drops/${dropId}/assign-driver`, { method: "POST", body: JSON.stringify({ driverId }) }),
  outForDelivery: (dropId: string) => apiRequest<DeliveryDrop>(`/dispatch/drops/${dropId}/out-for-delivery`, { method: "POST" }),
  proofUrl: (dropId: string) => apiRequest<{ url: string; expiresInSeconds: number }>(`/dispatch/drops/${dropId}/proof-url`),
};

export const staffApi = {
  /** Active staff whose role grants driver.own_drops.deliver (dispatch.assign_driver). */
  drivers: () => apiRequest<DriverOption[]>("/staff/drivers"),
  /** staff.manage: paginated, sorted by name; search matches name or email. */
  list: (query: { search?: string; page?: number; pageSize?: number } = {}) =>
    apiRequest<PaginatedResponse<StaffMember>>(`/staff?${toQuery(query)}`),
  create: (body: StaffCreateInput) => apiRequest<StaffMember>("/staff", { method: "POST", body: JSON.stringify(body) }),
  update: (id: string, body: StaffUpdateInput) => apiRequest<StaffMember>(`/staff/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  roles: () => apiRequest<StaffRole[]>("/roles"),
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

export const billingApi = {
  listInvoices: (query: { companyId?: string; status?: InvoiceStatus; page?: number; pageSize?: number } = {}) =>
    apiRequest<PaginatedResponse<InvoiceSummary>>(`/invoices?${toQuery({ pageSize: 100, ...query })}`),
  getInvoice: async (id: string) => (await apiRequest<{ data: InvoiceDetail }>(`/invoices/${id}`)).data,
  markPaid: (id: string) => apiRequest<Invoice>(`/invoices/${id}/pay`, { method: "POST" }),
  uninvoiced: (companyId: string, query: { page?: number; pageSize?: number } = {}) =>
    apiRequest<PaginatedResponse<UninvoicedOrder> & { totalUninvoicedCents: number }>(
      `/companies/${companyId}/billing/uninvoiced?${toQuery({ pageSize: 100, ...query })}`,
    ),
  createInvoice: async (companyId: string, orderIds: string[]) =>
    (await apiRequest<{ data: Invoice }>("/invoices", { method: "POST", body: JSON.stringify({ companyId, orderIds }) })).data,
};

// ─── Dashboards (backend-authoritative metrics) ─────────────────────────────

export const dashboardApi = {
  admin: () => apiRequest<AdminDashboardData>("/dashboard/admin"),
  kitchen: () => apiRequest<KitchenDashboardData>("/dashboard/kitchen"),
  dispatch: () => apiRequest<DispatchDashboardData>("/dashboard/dispatch"),
  driver: () => apiRequest<DriverDashboardData>("/dashboard/driver"),
};

// ─── Kitchen / orders / business time ────────────────────────────────────────

function toQuery(params: Record<string, string | number | boolean | undefined>): string {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value !== undefined && value !== "") qs.set(key, String(value));
  return qs.toString();
}

export type KitchenTransition = {
  success: true; orderId: string; kitchenReady: boolean;
  dispatch: { status: "NOT_READY" | "GROUPED" | "FAILED"; dropId?: string; recovery?: string };
};

export const kitchenApi = {
  board: (date: string, stationId?: string) =>
    apiRequest<KitchenBoardUnit[]>(`/kitchen?${toQuery({ date, stationId })}`),
  start: (prepUnitId: string) => apiRequest<KitchenTransition>(`/kitchen/prep-units/${prepUnitId}/start`, { method: "POST" }),
  done: (prepUnitId: string) => apiRequest<KitchenTransition>(`/kitchen/prep-units/${prepUnitId}/done`, { method: "POST" }),
  forceComplete: (orderId: string) => apiRequest<KitchenTransition>(`/kitchen/orders/${orderId}/force-complete`, { method: "POST" }),
};

export const ordersApi = {
  list: (query: OrderListQuery = {}) => apiRequest<PaginatedResponse<OrderListItem>>(`/orders?${toQuery(query)}`),
  get: (id: string) => apiRequest<OrderDetail>(`/orders/${id}`),
  create: (body: CreateOrderInput) => apiRequest<OrderDetail>("/orders", { method: "POST", body: JSON.stringify(body) }),
  update: (id: string, body: UpdateOrderInput) =>
    apiRequest<OrderDetail>(`/orders/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  place: (id: string) => apiRequest<OrderDetail>(`/orders/${id}/place`, { method: "POST" }),
  cancel: (id: string) => apiRequest<OrderDetail>(`/orders/${id}/cancel`, { method: "POST" }),
  reject: (id: string, rejectionReason: string) =>
    apiRequest<OrderDetail>(`/orders/${id}/reject`, { method: "POST", body: JSON.stringify({ rejectionReason }) }),
  overrideDelivery: (id: string, body: OverrideDeliveryInput) =>
    apiRequest<OrderDetail>(`/orders/${id}/delivery-details`, { method: "PATCH", body: JSON.stringify(body) }),
  forceComplete: (id: string) => apiRequest<unknown>(`/kitchen/orders/${id}/force-complete`, { method: "POST" }),
  /** Processes every order whose cut-off has passed (or one delivery date). Idempotent. */
  processCutoff: (deliveryDate?: string) =>
    apiRequest<CutoffSummary>("/orders/cutoff/process", {
      method: "POST",
      body: JSON.stringify(deliveryDate ? { deliveryDate } : {}),
    }),
};

export const businessTimeApi = {
  now: () => apiRequest<{ businessDate: string; timezone: string; serverNow: string }>("/business-time/now"),
  cutoff: (deliveryDate: string) => apiRequest<CutoffInfo>(`/business-time/cutoff/${deliveryDate}`),
};
