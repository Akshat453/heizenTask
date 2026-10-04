"use client";

import { useQuery } from "@tanstack/react-query";
import { billingApi, type InvoiceStatus } from "@/lib/api";

type InvoiceQuery = { companyId?: string; status?: InvoiceStatus; page?: number; pageSize?: number };

export const billingKeys = {
  all: ["billing"] as const,
  invoices: (query: InvoiceQuery) => [...billingKeys.all, "invoices", query] as const,
  invoice: (id: string) => [...billingKeys.all, "invoice", id] as const,
  uninvoiced: (companyId: string, query: object) => [...billingKeys.all, "uninvoiced", companyId, query] as const,
  uninvoicedSummary: (companyId: string) => [...billingKeys.all, "uninvoiced", companyId, "summary"] as const,
};

/** Uninvoiced count, server total and oldest delivery date (the list is sorted by delivery date ascending). */
export function useUninvoicedSummary(companyId: string) {
  return useQuery({ queryKey: billingKeys.uninvoicedSummary(companyId), queryFn: () => billingApi.uninvoiced(companyId, { pageSize: 1 }) });
}

export function useInvoiceCount(query: InvoiceQuery) {
  const q = { ...query, pageSize: 1 };
  return useQuery({ queryKey: billingKeys.invoices(q), queryFn: () => billingApi.listInvoices(q) });
}
