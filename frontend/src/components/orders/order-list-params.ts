"use client";

import { parseAsInteger, parseAsString, useQueryStates } from "nuqs";
import { addDays, type IsoDateRange } from "@/components/app/date-range-filter";
import type { OrderListQuery, OrderStatus } from "@/lib/api";

export const ORDER_STATUSES: OrderStatus[] = ["DRAFT", "PLACED", "CONFIRMED", "DELIVERED", "CANCELLED", "REJECTED"];
const DEFAULT_PAGE_SIZE = 25;

const parsers = {
  q: parseAsString,
  /** "YYYY-MM-DD..YYYY-MM-DD", "all", or absent (= today through the next 7 days). */
  dates: parseAsString,
  status: parseAsString,
  company: parseAsString,
  invoiced: parseAsString,
  page: parseAsInteger.withDefault(1),
  size: parseAsInteger.withDefault(DEFAULT_PAGE_SIZE),
};

export function defaultRange(today: string): IsoDateRange {
  return { from: today, to: addDays(today, 6) };
}

export function parseRange(dates: string | null, today: string | null): IsoDateRange {
  if (dates === "all") return { from: null, to: null };
  if (dates) {
    const [from, to] = dates.split("..");
    return { from: from || null, to: to || null };
  }
  return today ? defaultRange(today) : { from: null, to: null };
}

export function serializeRange(range: IsoDateRange): string {
  return range.from || range.to ? `${range.from ?? ""}..${range.to ?? ""}` : "all";
}

/** URL-synced order list filters (shareable; Back works). */
export function useOrderListParams(today: string | null) {
  const [params, setParams] = useQueryStates(parsers, { history: "replace" });
  const range = parseRange(params.dates, today);
  const status = ORDER_STATUSES.includes(params.status as OrderStatus) ? (params.status as OrderStatus) : undefined;
  const query: OrderListQuery = {
    page: params.page,
    pageSize: params.size,
    search: params.q ?? undefined,
    status,
    companyId: params.company ?? undefined,
    deliveryDateFrom: range.from ?? undefined,
    deliveryDateTo: range.to ?? undefined,
  };
  // invoiced=true is the only value the API parses correctly (see API_MAP boolean query bug).
  const invoicedOnly = params.invoiced === "yes";
  if (invoicedOnly) query.invoiced = true;
  return { params, setParams, range, query, invoicedOnly, ready: Boolean(today) || Boolean(params.dates) };
}
