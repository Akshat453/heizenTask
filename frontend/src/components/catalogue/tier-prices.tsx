"use client";

import { useQuery } from "@tanstack/react-query";
import { Star } from "lucide-react";
import Link from "next/link";
import { StatusBadge } from "@/components/app/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { catalogueApi } from "@/lib/api";
import { formatMoney } from "@/lib/format";

/** Effective price of one dish or option on every tier (GET /dishes|options/:id/prices). */
export function TierPrices({ itemId, kind }: { itemId: string; kind: "dishes" | "options" }) {
  const prices = useQuery({
    queryKey: ["pricing", "item-prices", kind, itemId],
    queryFn: () => (kind === "dishes" ? catalogueApi.dishPrices(itemId) : catalogueApi.optionPrices(itemId)),
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
        {prices.data?.map((p) => (
          <tr key={p.tierId} className="border-b last:border-0">
            <td className="py-2">
              <Link href={`/pricing/${p.tierId}`} className="text-primary hover:underline">{p.tierName}</Link>
              {p.isDefault && <Star className="ml-1 inline size-3 text-saffron" aria-label="Default tier" />}
              {!p.isActive && <span className="ml-2 text-xs text-muted-foreground">inactive tier</span>}
            </td>
            <td className="num py-2 text-right">{p.effectiveCents === null ? <span className="font-medium text-danger">Missing</span> : formatMoney(p.effectiveCents)}</td>
            <td className="py-2 text-right"><StatusBadge kind="priceSource" value={p.source} size="sm" /></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
