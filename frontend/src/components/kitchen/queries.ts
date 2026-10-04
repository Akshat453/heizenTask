"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { kitchenApi, type KitchenBoardUnit, type KitchenTransition } from "@/lib/api";
import { describeError, isApiError } from "@/lib/api-client";

export const BOARD_REFRESH_MS = 20_000;
export const kitchenKeys = {
  all: ["kitchen"] as const,
  board: (date: string) => [...kitchenKeys.all, "board", date] as const,
};

/** One request per date; station/state/timing filters are applied in memory. */
export const useKitchenBoard = (date: string | null) =>
  useQuery({
    queryKey: kitchenKeys.board(date ?? ""),
    queryFn: () => kitchenApi.board(date!),
    enabled: Boolean(date),
    refetchInterval: BOARD_REFRESH_MS,
    refetchOnWindowFocus: true,
  });

type Action = "start" | "done";
const STALE_MESSAGE = "Already updated by someone else. Showing the latest.";

function grouped(result: KitchenTransition) {
  if (result.dispatch.status === "FAILED")
    toast.warning("Order is ready, but grouping it into a drop failed", { description: "Dispatch can retry from its board (reconcile)." });
}

/**
 * Start/Done with an optimistic move to the next column; rolls back on error.
 * A 409 (already started/done, or no longer workable) refetches so the card ends
 * in the server's state.
 */
export function useUnitAction(date: string) {
  const queryClient = useQueryClient();
  const key = kitchenKeys.board(date);
  return useMutation({
    mutationFn: ({ unit, action }: { unit: KitchenBoardUnit; action: Action }) =>
      action === "start" ? kitchenApi.start(unit.id) : kitchenApi.done(unit.id),
    onMutate: async ({ unit, action }) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<KitchenBoardUnit[]>(key);
      const at = new Date().toISOString();
      queryClient.setQueryData<KitchenBoardUnit[]>(key, (units) =>
        units?.map((u) =>
          u.id !== unit.id
            ? u
            : action === "start"
              ? { ...u, prepState: "STARTED", startedAt: at }
              : { ...u, prepState: "DONE", startedAt: u.startedAt ?? at, doneAt: at, timingState: "COMPLETE" },
        ),
      );
      return { previous };
    },
    onError: (error, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
      toast.error(isApiError(error, 409) ? STALE_MESSAGE : describeError(error));
    },
    onSuccess: (result, { action }) => {
      toast.success(action === "start" ? "Unit started" : result.kitchenReady ? "Unit marked done · order ready" : "Unit marked done");
      grouped(result);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: key });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useForceComplete(date: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (orderId: string) => kitchenApi.forceComplete(orderId),
    onSuccess: (result) => {
      toast.success("Order completed");
      grouped(result);
    },
    onError: (error) => toast.error(isApiError(error, 409) ? STALE_MESSAGE : describeError(error)),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: kitchenKeys.board(date) });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}
