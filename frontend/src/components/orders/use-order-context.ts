"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/components/auth/auth-provider";
import { billingApi, companiesApi, dispatchApi, employeesApi, kitchenApi, type OrderDetail } from "@/lib/api";
import { toIsoDate } from "@/lib/format";
import { P } from "@/lib/permissions";
import { useCutoff } from "./queries";

/**
 * Supporting data the order detail response does not include (see Backend gaps):
 * cut-off, employee preferences, company tier/instructions, the drop (status,
 * driver, on-time, planned dispatch-ready) and kitchen timing. Each source is
 * loaded only when the signed-in role may read it; missing ones render "—".
 */
export function useOrderContext(order: OrderDetail | undefined) {
  const { can } = useAuth();
  const date = order ? toIsoDate(order.deliveryDate) : null;
  const confirmed = order?.status === "CONFIRMED" || order?.status === "DELIVERED";

  const cutoff = useCutoff(date, can(P.settingsRead));
  const employee = useQuery({
    queryKey: ["employees", "detail", order?.employeeId],
    queryFn: () => employeesApi.get(order!.employeeId),
    enabled: Boolean(order) && can(P.employeesRead),
    staleTime: 60_000,
  });
  const company = useQuery({
    queryKey: ["companies", "detail", order?.companyId],
    queryFn: () => companiesApi.get(order!.companyId),
    enabled: Boolean(order) && can(P.companiesRead),
    staleTime: 60_000,
  });
  const drop = useQuery({
    queryKey: ["orders", "drop", order?.deliveryDropId, date],
    queryFn: async () => (await dispatchApi.list(date!)).data.find((d) => d.id === order!.deliveryDropId) ?? null,
    enabled: Boolean(order?.deliveryDropId) && can(P.dispatchRead),
  });
  const kitchen = useQuery({
    queryKey: ["orders", "kitchen", order?.id, date],
    queryFn: async () => (await kitchenApi.board(date!)).filter((unit) => unit.orderId === order!.id),
    enabled: Boolean(order) && confirmed && can(P.kitchenRead),
  });
  const invoice = useQuery({
    queryKey: ["invoices", "detail", order?.invoiceOrder?.invoiceId],
    queryFn: () => billingApi.getInvoice(order!.invoiceOrder!.invoiceId),
    enabled: Boolean(order?.invoiceOrder) && can(P.billingRead),
    staleTime: 60_000,
  });

  return { cutoff, employee, company, drop, kitchen, invoice };
}

export type OrderContext = ReturnType<typeof useOrderContext>;
