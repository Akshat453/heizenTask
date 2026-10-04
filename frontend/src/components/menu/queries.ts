"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/components/auth/auth-provider";
import { companiesApi, menuApi } from "@/lib/api";
import { CONFLICT_MESSAGE, describeError, isApiError } from "@/lib/api-client";
import { P } from "@/lib/permissions";

export const menuKeys = {
  all: ["menu"] as const,
  categories: () => [...menuKeys.all, "categories"] as const,
  companies: () => [...menuKeys.all, "companies"] as const,
};

export const useCategories = () => useQuery({ queryKey: menuKeys.categories(), queryFn: menuApi.listCategories });

/** Company names for the hiding picker (one page of up to 100; names only). */
export function useCompanyOptions(enabled: boolean) {
  const { can } = useAuth();
  return useQuery({
    queryKey: menuKeys.companies(),
    queryFn: async () => (await companiesApi.list({ pageSize: 100 })).data.map((c) => ({ id: c.id, name: c.name })),
    enabled: enabled && can(P.companiesRead),
    staleTime: 5 * 60_000,
  });
}

/** Replaces the companies hiding a category or dish with one PUT (one transaction server-side). */
export function useSetHiding(kind: "category" | "dish") {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, companyIds }: { id: string; companyIds: string[] }): Promise<{ hiddenByCompanyIds: string[] }> =>
      kind === "category" ? menuApi.setCategoryHiding(id, companyIds) : menuApi.setDishHiding(id, companyIds),
    onSuccess: (result) => toast.success(result.hiddenByCompanyIds.length ? `Hidden from ${result.hiddenByCompanyIds.length} compan${result.hiddenByCompanyIds.length === 1 ? "y" : "ies"}` : "Shown to all companies"),
    onError: (error) => toast.error(isApiError(error, 409) ? CONFLICT_MESSAGE : describeError(error)),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: menuKeys.categories() });
      void queryClient.invalidateQueries({ queryKey: ["companies"] });
      void queryClient.invalidateQueries({ queryKey: ["employees", "menu-preview"] });
    },
  });
}
