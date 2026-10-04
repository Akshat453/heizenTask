"use client";

import { useQuery } from "@tanstack/react-query";
import { addDays } from "@/components/app/date-range-filter";
import { useAuth } from "@/components/auth/auth-provider";
import { businessTimeApi, companiesApi, employeesApi, referenceDataApi, type CutoffInfo } from "@/lib/api";
import { P } from "@/lib/permissions";

/** How far ahead the date picker knows cut-offs (beyond it the server decides on save). */
export const CUTOFF_WINDOW_DAYS = 28;

export function useBuilderData(employeeId: string | null, today: string | null) {
  const { can } = useAuth();
  const employee = useQuery({
    queryKey: ["employees", "detail", employeeId],
    queryFn: () => employeesApi.get(employeeId!),
    enabled: Boolean(employeeId),
  });
  const companyId = employee.data?.company.id;
  const company = useQuery({
    queryKey: ["companies", "detail", companyId],
    queryFn: () => companiesApi.get(companyId!),
    enabled: Boolean(companyId) && can(P.companiesRead),
  });
  const menu = useQuery({
    queryKey: ["employees", "menu-preview", employeeId],
    queryFn: () => employeesApi.menuPreview(employeeId!),
    enabled: Boolean(employeeId),
  });
  const packagings = useQuery({
    queryKey: ["reference", "packaging"],
    queryFn: referenceDataApi.packagingTypes,
    enabled: can(P.catalogueRead),
    staleTime: 5 * 60_000,
  });
  const cutoffs = useQuery({
    queryKey: ["cutoff-window-builder", today],
    enabled: Boolean(today) && can(P.settingsRead),
    staleTime: 60_000,
    queryFn: async () => {
      const infos = await Promise.all(
        Array.from({ length: CUTOFF_WINDOW_DAYS }, (_, i) => businessTimeApi.cutoff(addDays(today!, i))),
      );
      return new Map<string, CutoffInfo>(infos.map((info) => [info.deliveryDate, info]));
    },
  });
  return { employee, company, menu, packagings, cutoffs };
}

export type BuilderData = ReturnType<typeof useBuilderData>;
