import { useQuery, type QueryClient } from "@tanstack/react-query";
import { businessTimeApi, ordersApi, type OrderListQuery } from "@/lib/api";

export const orderKeys = {
  all: ["orders"] as const,
  list: (query: OrderListQuery) => [...orderKeys.all, "list", query] as const,
  detail: (id: string) => [...orderKeys.all, "detail", id] as const,
  context: (id: string) => [...orderKeys.all, "context", id] as const,
};

export const cutoffKey = (date: string) => ["cutoff", date] as const;

export const useOrder = (id: string) => useQuery({ queryKey: orderKeys.detail(id), queryFn: () => ordersApi.get(id) });

/** Cut-off info for one delivery date (backend rule; requires settings.read). */
export const useCutoff = (date: string | null | undefined, enabled = true) =>
  useQuery({
    queryKey: cutoffKey(date ?? ""),
    queryFn: () => businessTimeApi.cutoff(date!),
    enabled: enabled && Boolean(date),
    staleTime: 60_000,
  });

/** After any order mutation: the order, every order list, and dashboards. */
export function invalidateOrders(queryClient: QueryClient, id?: string) {
  void queryClient.invalidateQueries({ queryKey: orderKeys.all });
  void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  if (id) void queryClient.invalidateQueries({ queryKey: orderKeys.detail(id) });
}
