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

/** Active tiers with active dishes that resolve to no price (the API reports priceCents = null). */
export function useTiersMissingPrices(enabled: boolean) {
  return useQuery({
    queryKey: ["dashboard", "tiers-missing-prices"],
    enabled,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const tiers = (await pricingApi.listTiers()).filter((tier) => tier.isActive);
      const editors = await Promise.all(tiers.map((tier) => pricingApi.getTierEditor(tier.id)));
      return editors
        .map((editor) => ({
          tierId: editor.tier.id,
          tierName: editor.tier.name,
          dishes: editor.dishes.filter((dish) => dish.isActive && dish.priceCents === null).map((dish) => dish.name),
        }))
        .filter((tier) => tier.dishes.length > 0);
    },
  });
}
