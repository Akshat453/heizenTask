import { apiRequest } from "@/lib/api-client";
import type {
  PaginatedResponse,
  NamedReference,
  OrderedReference,
  Dish,
  Option,
  MenuCategory,
  PriceTier,
  Company,
  CompanyWriteInput,
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

export const pricingApi = {
  listTiers: () => apiRequest<(PriceTier & { _count: { companies: number } })[]>("/price-tiers"),
  getTierEditor: (id: string) => apiRequest<{
    tier: PriceTier;
    dishes: { id: string; name: string; sku: string; costCents: number; isActive: boolean; overridePriceCents: number | null; priceCents: number | null; source: string }[];
    options: { id: string; name: string; costCents: number; isActive: boolean; overridePriceCents: number | null; priceCents: number | null; source: string }[];
  }>(`/price-tiers/${id}/editor`),
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
  create: (body: CompanyWriteInput) => apiRequest<Company>("/companies", { method: "POST", body: JSON.stringify(body) }),
  update: (id: string, body: Partial<CompanyWriteInput>) => apiRequest<Company>(`/companies/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
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
};

// ─── Settings ───────────────────────────────────────────────────────────────

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

export const DROP_STATUS_LABEL: Record<DeliveryDropStatus, string> = {
  DISPATCH_READY: "Dispatch Ready",
  OUT_FOR_DELIVERY: "Out for Delivery",
  DELIVERED: "Delivered",
};

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
