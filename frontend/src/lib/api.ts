/* eslint-disable @typescript-eslint/no-explicit-any */
import { apiRequest } from "./api-client";

// ─── Shared ────────────────────────────────────────────────────────────────────

export type PaginatedResponse<T> = {
  data: T[];
  pagination: { page: number; pageSize: number; totalItems: number; totalPages: number };
};

// ─── Reference Data ─────────────────────────────────────────────────────────

export type NamedReference = { id: string; name: string; isActive: boolean };
export type OrderedReference = NamedReference & { displayOrder: number };

export const referenceDataApi = {
  allergens: () => apiRequest<NamedReference[]>("/allergens"),
  dietaryTags: () => apiRequest<NamedReference[]>("/dietary-tags"),
  kitchenStations: () => apiRequest<OrderedReference[]>("/kitchen-stations"),
  portionSizes: () => apiRequest<OrderedReference[]>("/portion-sizes"),
  packagingTypes: () => apiRequest<OrderedReference[]>("/packaging-types"),

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
  listOptions: () => apiRequest<Option[]>("/options"),
};

// ─── Menu ───────────────────────────────────────────────────────────────────

export type MenuCategory = {
  id: string; name: string; slug: string; displayOrder: number;
  isActive: boolean; isSecret: boolean;
  items: { dishId: string; displayOrder: number; dish: Pick<Dish, "id" | "name" | "sku" | "isActive"> }[];
  _count?: { items: number };
};

export const menuApi = {
  listCategories: () => apiRequest<MenuCategory[]>("/menu/categories"),
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

export type Company = {
  id: string; name: string;
  ownerEmployee: { id: string; name: string; email: string | null } | null;
  priceTier: PriceTier | null;
  domains: { domain: string }[];
  addresses: { id: string; label: string; line1: string; city: string; country: string; isActive: boolean }[];
  _count?: { employees: number };
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
  create: (body: any) => apiRequest<Company>("/companies", { method: "POST", body: JSON.stringify(body) }),
  update: (id: string, body: any) => apiRequest<Company>(`/companies/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
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
  create: (companyId: string, body: any) => apiRequest<Employee>(`/companies/${companyId}/employees`, { method: "POST", body: JSON.stringify(body) }),
  update: (id: string, body: any) => apiRequest<Employee>(`/employees/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
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
  cutoffWorkingDayCount: number; kitchenReadyBufferMinutes: number;
};

export const settingsApi = {
  get: () => apiRequest<{
    settings: PlatformSettings;
    workingDays: string[];
    holidays: { id: string; date: string; name: string | null }[];
  }>("/settings"),
  update: (body: Partial<{ cutoffTime: string; cutoffWorkingDayCount: number; businessTimezone: string; kitchenReadyBufferMinutes: number }>) =>
    apiRequest<PlatformSettings>("/settings", { method: "PUT", body: JSON.stringify(body) }),
  upsertWorkingDays: (days: string[]) =>
    apiRequest<{ dayOfWeek: string }[]>("/settings/working-days", { method: "PUT", body: JSON.stringify({ days }) }),
  createHoliday: (body: { date: string; name?: string }) =>
    apiRequest<{ id: string; date: string; name: string | null }>("/settings/holidays", { method: "POST", body: JSON.stringify(body) }),
  deleteHoliday: (id: string) =>
    apiRequest<void>(`/settings/holidays/${id}`, { method: "DELETE" }),
};
