"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { StatusBadge } from "@/components/app/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { pricingApi } from "@/lib/api";
import { formatMoney } from "@/lib/format";

/** Resolved price of one dish or option on every tier (read-only, from each tier's editor). */
export function TierPrices({ itemId, kind }: { itemId: string; kind: "dishes" | "options" }) {
  const prices = useQuery({
    queryKey: ["pricing", "item-prices", kind, itemId],
    queryFn: async () => {
      const tiers = await pricingApi.listTiers();
      const editors = await Promise.all(tiers.map((t) => pricingApi.getTierEditor(t.id)));
      return editors.map((e) => ({ tier: e.tier, row: e[kind].find((r) => r.id === itemId) }));
    },
  });
  if (prices.isLoading) return <Skeleton className="h-24" />;
  if (prices.error) return <p className="text-sm text-danger">Could not load tier prices.</p>;
  return (
    <table className="w-full text-sm">
      <thead className="border-b">
        <tr>
          <th scope="col" className="label-caps h-8 text-left text-muted-foreground">Tier</th>
          <th scope="col" className="label-caps text-right text-muted-foreground">Price</th>
          <th scope="col" className="label-caps text-right text-muted-foreground">Source</th>
        </tr>
      </thead>
      <tbody>
        {prices.data?.map(({ tier, row }) => (
          <tr key={tier.id} className="border-b last:border-0">
            <td className="py-2">
              <Link href={`/pricing/${tier.id}`} className="text-primary hover:underline">{tier.name}</Link>
              {!tier.isActive && <span className="ml-2 text-xs text-muted-foreground">inactive tier</span>}
            </td>
            <td className="num py-2 text-right">{row?.priceCents == null ? <span className="font-medium text-danger">Missing</span> : formatMoney(row.priceCents)}</td>
            <td className="py-2 text-right">
              <StatusBadge kind="priceSource" value={row?.priceCents == null ? "MISSING" : row.source === "OVERRIDE" ? "OVERRIDE" : "DERIVED"} size="sm" />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
