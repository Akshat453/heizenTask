import { useQuery } from "@tanstack/react-query";
import { ordersApi, pricingApi, type CutoffInfo } from "@/lib/api";
import { lastPassedDate } from "./use-cutoff-window";

/** Orders still DRAFT/PLACED on delivery dates whose cut-off has passed (server counts via totalItems). */
export function useUnprocessedCutoff(today: string | null, window: CutoffInfo[] | undefined, enabled: boolean) {
  const upTo = today ? lastPassedDate(window, today) : null;
  return useQuery({
    queryKey: ["dashboard", "unprocessed-cutoff", upTo],
    enabled: enabled && Boolean(upTo) && Boolean(window),
    refetchInterval: 60_000,
    queryFn: async () => {
      const [placed, drafts] = await Promise.all([
        ordersApi.list({ status: "PLACED", deliveryDateTo: upTo!, pageSize: 1 }),
        ordersApi.list({ status: "DRAFT", deliveryDateTo: upTo!, pageSize: 1 }),
      ]);
      return { upTo: upTo!, placed: placed.pagination.totalItems, drafts: drafts.pagination.totalItems };
    },
  });
}

/** Active tiers with dishes the menu resolver cannot price (counts from GET /price-tiers). */
export function useTiersMissingPrices(enabled: boolean) {
  return useQuery({
    queryKey: ["dashboard", "tiers-missing-prices"],
    enabled,
    staleTime: 5 * 60_000,
    queryFn: async () =>
      (await pricingApi.listTiers())
        .filter((tier) => tier.isActive && (tier.missingDishCount ?? 0) > 0)
        .map((tier) => ({ tierId: tier.id, tierName: tier.name, missingDishes: tier.missingDishCount ?? 0 })),
  });
}
