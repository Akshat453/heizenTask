"use client";

import { useEffect, useState } from "react";
import { pricingApi, type PriceTier } from "@/lib/api";

type TierWithCount = PriceTier & { _count: { companies: number } };

export default function PricingPage() {
  const [tiers, setTiers] = useState<TierWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTiers() {
      try {
        const response = await pricingApi.listTiers();
        setTiers(response);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load pricing tiers");
      } finally {
        setLoading(false);
      }
    }
    fetchTiers();
  }, []);

  if (loading) return <div className="p-8">Loading pricing tiers...</div>;
  if (error) return <div className="p-8 text-danger">{error}</div>;

  return (
    <main className="p-8 max-w-7xl mx-auto">
      <h1 className="text-2xl font-semibold mb-6">Pricing Tiers</h1>
      
      {tiers.length === 0 ? (
        <p className="text-muted-foreground">No price tiers found.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {tiers.map((t) => (
            <div key={t.id} className="p-6 rounded-lg border bg-card shadow-sm flex flex-col h-full">
              <div className="flex items-start justify-between mb-4">
                <h2 className="text-lg font-semibold">{t.name}</h2>
                {t.isDefault && (
                  <span className="text-xs bg-success-soft text-success px-2 py-1 rounded">Default</span>
                )}
              </div>
              
              <div className="flex-1 space-y-2 text-sm text-muted-foreground">
                <p><span className="font-medium text-foreground">Strategy:</span> {t.strategy.replace(/_/g, " ")}</p>
                {t.strategy === "COST_MULTIPLIER" && t.costMultiplierBps && (
                  <p><span className="font-medium text-foreground">Multiplier:</span> {(t.costMultiplierBps / 10000).toFixed(2)}x</p>
                )}
                {t.strategy === "TIER_PERCENTAGE" && t.sourceAdjustmentBps && (
                  <p><span className="font-medium text-foreground">Adjustment:</span> {t.sourceAdjustmentBps > 0 ? "+" : ""}{(t.sourceAdjustmentBps / 100).toFixed(2)}%</p>
                )}
                <p className="pt-4"><span className="font-medium text-foreground">Companies assigned:</span> {t._count.companies}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
