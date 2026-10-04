"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Layers, Plus, Star, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { EmptyState } from "@/components/app/empty-state";
import { ErrorState } from "@/components/app/error-state";
import { PageHeader } from "@/components/app/page-header";
import { useAuth } from "@/components/auth/auth-provider";
import { pricingKeys, strategyLabel } from "@/components/pricing/strategy";
import { TierDialog } from "@/components/pricing/tier-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { pricingApi, type PriceTier } from "@/lib/api";
import { CONFLICT_MESSAGE, describeError, isApiError } from "@/lib/api-client";
import { formatCount } from "@/lib/format";
import { P } from "@/lib/permissions";

export default function PricingPage() {
  const { can } = useAuth();
  const queryClient = useQueryClient();
  const canManage = can(P.pricingManage);
  const [creating, setCreating] = useState(false);
  const [makeDefault, setMakeDefault] = useState<PriceTier | null>(null);
  const tiers = useQuery({ queryKey: pricingKeys.tiers(), queryFn: pricingApi.listTiers });
  // Missing-price counts come from each tier's editor (the list has no such field; backend gap).
  const missing = useQuery({
    queryKey: pricingKeys.missing(),
    enabled: Boolean(tiers.data),
    queryFn: async () => {
      const editors = await Promise.all(tiers.data!.map((t) => pricingApi.getTierEditor(t.id)));
      return new Map(editors.map((e) => [e.tier.id, e.dishes.filter((d) => d.isActive && d.priceCents === null).length]));
    },
  });
  const setDefault = useMutation({
    mutationFn: (tier: PriceTier) => pricingApi.updateTier(tier.id, { isDefault: true }),
    onSuccess: (_r, tier) => toast.success(`${tier.name} is now the default tier`),
    onError: (e) => toast.error(isApiError(e, 409) ? `${CONFLICT_MESSAGE} ${e.message}` : describeError(e)),
    onSettled: () => {
      setMakeDefault(null);
      void queryClient.invalidateQueries({ queryKey: pricingKeys.all });
    },
  });
  const list = [...(tiers.data ?? [])].sort((a, b) => Number(b.isDefault) - Number(a.isDefault) || a.name.localeCompare(b.name));

  return (
    <main className="flex flex-col gap-6 p-4 md:p-6">
      <PageHeader
        title="Pricing tiers"
        description="Each company orders at one tier (the default when none is set). Prices change new orders only."
        actions={canManage && <Button onClick={() => setCreating(true)}><Plus data-icon="inline-start" /> New tier</Button>}
      />
      {tiers.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-40" />)}</div>
      ) : tiers.error ? (
        <ErrorState error={tiers.error} title="Could not load price tiers" onRetry={() => void tiers.refetch()} />
      ) : list.length === 0 ? (
        <EmptyState icon={Layers} title="No price tiers" description="Create a tier and mark it as the default." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((tier) => {
            const gaps = missing.data?.get(tier.id) ?? 0;
            return (
              <article key={tier.id} className="flex flex-col gap-3 rounded-lg border bg-card p-4">
                <div className="flex items-start justify-between gap-2">
                  <Link href={`/pricing/${tier.id}`} className="text-base font-semibold text-primary hover:underline">{tier.name}</Link>
                  {tier.isDefault && (
                    <span className="inline-flex items-center gap-1 rounded-md border border-saffron/40 bg-saffron-soft px-1.5 text-xs font-medium"><Star className="size-3" aria-hidden /> Default</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5 text-xs">
                  <span className="rounded-md border bg-secondary px-1.5 py-0.5 text-secondary-foreground">{strategyLabel(tier, list)}</span>
                  {!tier.isActive && <span className="rounded-md border bg-neutral-soft px-1.5 py-0.5 text-neutral">Inactive</span>}
                </div>
                <p className="text-sm text-muted-foreground"><span className="num">{formatCount(tier._count.companies)}</span> compan{tier._count.companies === 1 ? "y" : "ies"} on this tier</p>
                {missing.isLoading ? <Skeleton className="h-4 w-40" /> : gaps > 0 ? (
                  <p className="flex items-center gap-1 text-sm font-medium text-danger"><TriangleAlert className="size-3.5" aria-hidden /> {gaps} dish{gaps === 1 ? "" : "es"} missing a price</p>
                ) : (
                  <p className="text-sm text-success">Every active dish is priced</p>
                )}
                <div className="mt-auto flex gap-2 pt-1">
                  <Button size="sm" variant="outline" render={<Link href={`/pricing/${tier.id}`} />} nativeButton={false}>Open editor</Button>
                  {canManage && !tier.isDefault && tier.isActive && <Button size="sm" variant="ghost" onClick={() => setMakeDefault(tier)}>Set as default</Button>}
                </div>
              </article>
            );
          })}
        </div>
      )}
      {creating && <TierDialog tiers={list} open onOpenChange={setCreating} />}
      <ConfirmDialog
        open={Boolean(makeDefault)}
        onOpenChange={(o) => !o && setMakeDefault(null)}
        title={`Make ${makeDefault?.name} the default tier?`}
        description="Employees of companies without a tier will see these prices on new orders."
        confirmLabel="Set as default"
        pending={setDefault.isPending}
        onConfirm={() => makeDefault && setDefault.mutate(makeDefault)}
      />
    </main>
  );
}
