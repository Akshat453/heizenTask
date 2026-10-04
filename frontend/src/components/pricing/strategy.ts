import type { PriceTier } from "@/lib/api";
import { formatScaled } from "@/lib/decimal-input";

/** "Manual", "Cost × 2.4", "Standard + 15%" (basis points shown as decimals; no float maths). */
export function strategyLabel(tier: PriceTier, tiers: { id: string; name: string }[]): string {
  if (tier.strategy === "COST_MULTIPLIER") return `Cost × ${formatScaled(tier.costMultiplierBps ?? 0, 4)}`;
  if (tier.strategy === "TIER_PERCENTAGE") {
    const source = tiers.find((t) => t.id === tier.sourceTierId)?.name ?? "Source tier";
    const adj = tier.sourceAdjustmentBps ?? 0;
    return `${source} ${adj < 0 ? "−" : "+"} ${formatScaled(Math.abs(adj), 2)}%`;
  }
  return "Manual";
}

export const pricingKeys = {
  all: ["pricing"] as const,
  tiers: () => [...pricingKeys.all, "tiers"] as const,
  editor: (id: string) => [...pricingKeys.all, "editor", id] as const,
  missing: () => [...pricingKeys.all, "missing"] as const,
};
