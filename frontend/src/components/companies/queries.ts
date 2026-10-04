"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { companiesApi, type CompanyUpdateInput } from "@/lib/api";
import { CONFLICT_MESSAGE, describeError, isApiError } from "@/lib/api-client";

export const companyKeys = {
  all: ["companies"] as const,
  list: (query: object) => [...companyKeys.all, "list", query] as const,
  detail: (id: string) => [...companyKeys.all, "detail", id] as const,
};

export const useCompany = (id: string) => useQuery({ queryKey: companyKeys.detail(id), queryFn: () => companiesApi.get(id) });

/** Server messages from the last failed save (400/409), for inline display by the tab that saved. */
export const errorMessages = (error: unknown): string[] =>
  error ? (isApiError(error) ? error.messages : [describeError(error)]) : [];

/**
 * PATCH /companies/:id with one tab's fields. Validation errors (400) are left
 * for the tab to show inline; a 409 that is a lost race refetches.
 */
export function useUpdateCompany(id: string, success: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CompanyUpdateInput) => companiesApi.update(id, body),
    onSuccess: (company) => {
      toast.success(success);
      queryClient.setQueryData(companyKeys.detail(id), company);
    },
    onError: (error) => {
      if (isApiError(error, 409) && /concurrent|changed/i.test(error.message)) toast.error(CONFLICT_MESSAGE);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: companyKeys.all });
      void queryClient.invalidateQueries({ queryKey: ["menu"] });
      void queryClient.invalidateQueries({ queryKey: ["employees"] });
    },
  });
}
