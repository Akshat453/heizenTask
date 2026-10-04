"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/components/auth/auth-provider";
import { companiesApi, menuApi, type CompanyDetail, type PaginatedResponse, type Company } from "@/lib/api";
import { apiRequest, CONFLICT_MESSAGE, describeError, isApiError } from "@/lib/api-client";
import { P } from "@/lib/permissions";

export const menuKeys = {
  all: ["menu"] as const,
  categories: () => [...menuKeys.all, "categories"] as const,
  hiding: () => [...menuKeys.all, "hiding"] as const,
};

export const useCategories = () => useQuery({ queryKey: menuKeys.categories(), queryFn: menuApi.listCategories });

export type HidingIndex = {
  companies: { id: string; name: string }[];
  /** categoryId -> company ids hiding it */
  categories: Map<string, Set<string>>;
  /** dishId -> company ids hiding it */
  dishes: Map<string, Set<string>>;
  details: Map<string, CompanyDetail>;
};

/**
 * Which companies hide which categories and dishes. The API only exposes this
 * per company (GET /companies/:id), so the index loads every company's detail
 * (backend gap: no reverse lookup on menu endpoints).
 */
export function useHidingIndex() {
  const { can } = useAuth();
  return useQuery({
    queryKey: menuKeys.hiding(),
    enabled: can(P.companiesRead),
    staleTime: 60_000,
    queryFn: async (): Promise<HidingIndex> => {
      const list = await apiRequest<PaginatedResponse<Company>>("/companies?pageSize=100");
      const details = await Promise.all(list.data.map((c) => companiesApi.get(c.id)));
      const index: HidingIndex = { companies: list.data.map((c) => ({ id: c.id, name: c.name })), categories: new Map(), dishes: new Map(), details: new Map() };
      for (const company of details) {
        index.details.set(company.id, company);
        for (const h of company.hiddenCategories ?? []) (index.categories.get(h.categoryId) ?? index.categories.set(h.categoryId, new Set()).get(h.categoryId)!).add(company.id);
        for (const h of company.hiddenDishes ?? []) (index.dishes.get(h.dishId) ?? index.dishes.set(h.dishId, new Set()).get(h.dishId)!).add(company.id);
      }
      return index;
    },
  });
}

/**
 * Hides/unhides one category or dish for a set of companies by updating each
 * changed company's hidden list (PATCH /companies/:id; other fields are kept).
 */
export function useUpdateHiding(kind: "category" | "dish") {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ itemId, index, companyIds }: { itemId: string; index: HidingIndex; companyIds: Set<string> }) => {
      const current = (kind === "category" ? index.categories : index.dishes).get(itemId) ?? new Set<string>();
      const changed = index.companies.filter((c) => current.has(c.id) !== companyIds.has(c.id));
      for (const company of changed) {
        const detail = index.details.get(company.id)!;
        if (kind === "category") {
          const ids = new Set((detail.hiddenCategories ?? []).map((h) => h.categoryId));
          if (companyIds.has(company.id)) ids.add(itemId);
          else ids.delete(itemId);
          await companiesApi.update(company.id, { hiddenCategoryIds: [...ids] });
        } else {
          const ids = new Set((detail.hiddenDishes ?? []).map((h) => h.dishId));
          if (companyIds.has(company.id)) ids.add(itemId);
          else ids.delete(itemId);
          await companiesApi.update(company.id, { hiddenDishIds: [...ids] });
        }
      }
      return changed.length;
    },
    onSuccess: (count) => toast.success(count ? `Hiding updated for ${count} compan${count === 1 ? "y" : "ies"}` : "No changes"),
    onError: (error) => toast.error(isApiError(error, 409) ? CONFLICT_MESSAGE : describeError(error)),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: menuKeys.hiding() });
      void queryClient.invalidateQueries({ queryKey: ["companies"] });
      void queryClient.invalidateQueries({ queryKey: ["employees", "menu-preview"] });
    },
  });
}
