"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/components/auth/auth-provider";
import { dispatchApi, ordersApi, staffApi, type DispatchDrop, type DropListQuery, type PaginatedResponse } from "@/lib/api";
import { CONFLICT_MESSAGE, describeError, isApiError } from "@/lib/api-client";
import { P } from "@/lib/permissions";

export const DISPATCH_REFRESH_MS = 30_000;
export const dispatchKeys = {
  all: ["dispatch"] as const,
  drops: (query: DropListQuery) => [...dispatchKeys.all, "drops", query] as const,
  dropsPrefix: () => [...dispatchKeys.all, "drops"] as const,
  waiting: (date: string) => [...dispatchKeys.all, "waiting", date] as const,
  drivers: () => [...dispatchKeys.all, "drivers"] as const,
};

/** Auto-refresh is paused while a drag is in progress. */
const live = (paused: boolean) => ({ refetchInterval: paused ? (false as const) : DISPATCH_REFRESH_MS, refetchOnWindowFocus: !paused });

/** Drops for a day; search and driver filter are applied by the server before pagination. */
export const useDrops = (query: DropListQuery | null, paused = false) =>
  useQuery({
    queryKey: dispatchKeys.drops(query ?? { date: "" }),
    queryFn: () => dispatchApi.list(query!),
    enabled: Boolean(query?.date),
    placeholderData: (previous) => previous,
    ...live(paused),
  });

/** Confirmed orders of the day (the board shows those without a drop as "waiting on kitchen"). */
export function useDayOrders(date: string | null, paused = false) {
  const { can } = useAuth();
  return useQuery({
    queryKey: dispatchKeys.waiting(date ?? ""),
    queryFn: () => ordersApi.list({ deliveryDateFrom: date!, deliveryDateTo: date!, status: "CONFIRMED", pageSize: 100 }),
    enabled: Boolean(date) && can(P.ordersRead),
    ...live(paused),
  });
}

export function useDrivers() {
  const { can } = useAuth();
  return useQuery({ queryKey: dispatchKeys.drivers(), queryFn: staffApi.drivers, enabled: can(P.dispatchAssignDriver), staleTime: 5 * 60_000 });
}

function invalidateAll(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: dispatchKeys.all });
  void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  void queryClient.invalidateQueries({ queryKey: ["orders"] });
}

function reportError(error: unknown) {
  if (isApiError(error, 409)) toast.error(CONFLICT_MESSAGE, { description: error.message });
  else toast.error(describeError(error));
}

/** Shared mutation conventions for dispatch actions. */
export function useDispatchMutation<V, R = unknown>(fn: (vars: V) => Promise<R>, success: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => toast.success(success),
    onError: reportError,
    onSettled: () => invalidateAll(queryClient),
  });
}

type DropPages = PaginatedResponse<DispatchDrop>;

/**
 * DISPATCH_READY → OUT_FOR_DELIVERY, used by both the button and drag and drop:
 * the card moves at once and rolls back if the server refuses.
 */
export function useOutForDelivery() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (drop: DispatchDrop) => dispatchApi.outForDelivery(drop.id),
    onMutate: async (drop) => {
      await queryClient.cancelQueries({ queryKey: dispatchKeys.dropsPrefix() });
      const previous = queryClient.getQueriesData<DropPages>({ queryKey: dispatchKeys.dropsPrefix() });
      const at = new Date().toISOString();
      queryClient.setQueriesData<DropPages>({ queryKey: dispatchKeys.dropsPrefix() }, (page) =>
        page && { ...page, data: page.data.map((d) => (d.id === drop.id ? { ...d, status: "OUT_FOR_DELIVERY", outForDeliveryAt: at } : d)) },
      );
      return { previous };
    },
    onError: (error, _drop, context) => {
      context?.previous.forEach(([key, data]) => queryClient.setQueryData(key, data));
      reportError(error);
    },
    onSuccess: () => toast.success("Marked out for delivery"),
    onSettled: () => invalidateAll(queryClient),
  });
}
