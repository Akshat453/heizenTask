"use client";

import { useQueries, useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { useState } from "react";
import { Field } from "@/components/app/field";
import { FormErrorAlert } from "@/components/app/form-error-alert";
import { Panel } from "@/components/app/panel";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { menuApi, pricingApi, type CompanyDetail } from "@/lib/api";
import { P } from "@/lib/permissions";
import { errorMessages, useUpdateCompany } from "./queries";

const DEFAULT_TIER = "__default";

export function MenuPricingTab({ company, canManage }: { company: CompanyDetail; canManage: boolean }) {
  const { can } = useAuth();
  const tiers = useQuery({ queryKey: ["pricing", "tiers"], queryFn: pricingApi.listTiers, enabled: can(P.pricingRead) });
  const categories = useQuery({ queryKey: ["menu", "categories"], queryFn: menuApi.listCategories });
  const details = useQueries({
    queries: (categories.data ?? []).map((c) => ({ queryKey: ["menu", "categories", c.id], queryFn: () => menuApi.getCategory(c.id), staleTime: 60_000 })),
  });
  const [tierId, setTierId] = useState<string | null>(company.priceTier?.id ?? null);
  const initialCats = new Set(company.hiddenCategories.map((h) => h.categoryId));
  const initialDishes = new Set(company.hiddenDishes.map((h) => h.dishId));
  const [hiddenCats, setHiddenCats] = useState(initialCats);
  const [hiddenDishes, setHiddenDishes] = useState(initialDishes);
  const [q, setQ] = useState("");
  const saveTier = useUpdateCompany(company.id, "Price tier saved");
  const saveHidden = useUpdateCompany(company.id, "Menu hiding saved");
  const toggle = (set: Set<string>, id: string, on: boolean) => {
    const next = new Set(set);
    if (on) next.add(id);
    else next.delete(id);
    return next;
  };
  const sameSet = (a: Set<string>, b: Set<string>) => a.size === b.size && [...a].every((x) => b.has(x));
  const hiddenDirty = !sameSet(hiddenCats, initialCats) || !sameSet(hiddenDishes, initialDishes);
  const needle = q.trim().toLowerCase();

  return (
    <div className="grid gap-6 lg:grid-cols-[22rem_1fr]">
      <Panel title="Price tier" description="New orders use this tier's prices.">
        <Field id="mp-tier" label="Tier">
          <Select value={tierId ?? DEFAULT_TIER} disabled={!canManage || !tiers.data} onValueChange={(v) => setTierId(!v || v === DEFAULT_TIER ? null : String(v))}>
            <SelectTrigger id="mp-tier" className="w-full">
              <SelectValue>{(v: string) => (v === DEFAULT_TIER ? "Use default tier" : (tiers.data?.find((t) => t.id === v)?.name ?? company.priceTier?.name ?? "Tier"))}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={DEFAULT_TIER}>Use default tier</SelectItem>
              {(tiers.data ?? []).filter((t) => t.isActive).map((t) => <SelectItem key={t.id} value={t.id}>{t.name}{t.isDefault && " (default)"}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <FormErrorAlert messages={errorMessages(saveTier.error)} />
        {canManage && (
          <Button className="mt-3 w-fit" disabled={tierId === (company.priceTier?.id ?? null) || saveTier.isPending} onClick={() => saveTier.mutate({ priceTierId: tierId })}>
            {saveTier.isPending ? "Saving…" : "Save tier"}
          </Button>
        )}
      </Panel>

      <Panel title="Hidden from this company" description="Ticked categories and dishes are not shown to this company's employees. Hiding a dish hides it in every category.">
        <div className="relative mb-3 max-w-sm">
          <Search aria-hidden className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search categories or dishes" aria-label="Search menu" className="pl-8" />
        </div>
        {categories.isLoading ? (
          <Skeleton className="h-48" />
        ) : (
          <ul className="flex flex-col gap-2">
            {(categories.data ?? []).map((c, i) => {
              const items = details[i]?.data?.items ?? [];
              const matchCat = !needle || c.name.toLowerCase().includes(needle);
              const shown = items.filter((it) => matchCat || it.dish.name.toLowerCase().includes(needle));
              if (!matchCat && shown.length === 0) return null;
              return (
                <li key={c.id} className="rounded-lg border p-2">
                  <label className="flex items-center gap-2 font-medium">
                    <Checkbox disabled={!canManage} checked={hiddenCats.has(c.id)} onCheckedChange={(on) => setHiddenCats(toggle(hiddenCats, c.id, Boolean(on)))} />
                    {c.name}
                    {c.isSecret && <span className="text-xs font-normal text-muted-foreground">secret</span>}
                  </label>
                  <ul className="mt-1 ml-6 flex flex-col gap-1">
                    {shown.map((it) => (
                      <li key={it.dishId}>
                        <label className="flex items-center gap-2 text-sm">
                          <Checkbox disabled={!canManage || hiddenCats.has(c.id)} checked={hiddenDishes.has(it.dishId)} onCheckedChange={(on) => setHiddenDishes(toggle(hiddenDishes, it.dishId, Boolean(on)))} />
                          {it.dish.name}
                        </label>
                      </li>
                    ))}
                  </ul>
                </li>
              );
            })}
          </ul>
        )}
        <FormErrorAlert messages={errorMessages(saveHidden.error)} />
        {canManage && (
          <Button className="mt-3 w-fit" disabled={!hiddenDirty || saveHidden.isPending} onClick={() => saveHidden.mutate({ hiddenCategoryIds: [...hiddenCats], hiddenDishIds: [...hiddenDishes] })}>
            {saveHidden.isPending ? "Saving…" : "Save hiding"}
          </Button>
        )}
      </Panel>
    </div>
  );
}
