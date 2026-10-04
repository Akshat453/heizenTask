"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Layers, Pencil, Search } from "lucide-react";
import { useParams } from "next/navigation";
import { parseAsBoolean, parseAsString, useQueryStates } from "nuqs";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { EmptyState } from "@/components/app/empty-state";
import { ErrorState } from "@/components/app/error-state";
import { FormErrorAlert } from "@/components/app/form-error-alert";
import { StickySaveBar } from "@/components/app/form-layout";
import { PageHeader } from "@/components/app/page-header";
import { useAuth } from "@/components/auth/auth-provider";
import { EditorGrid, isChanged, sourceOf, type GridRow } from "@/components/pricing/editor-grid";
import { pricingKeys, strategyLabel } from "@/components/pricing/strategy";
import { TierDialog } from "@/components/pricing/tier-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useUnsavedChangesGuard } from "@/hooks/use-unsaved-changes";
import { menuApi, pricingApi, type PriceOverride } from "@/lib/api";
import { CONFLICT_MESSAGE, describeError, isApiError } from "@/lib/api-client";
import { parseMoneyToCents } from "@/lib/decimal-input";
import { P } from "@/lib/permissions";

const ALL = "__all";

export default function TierEditorPage() {
  const { id } = useParams<{ id: string }>();
  const { can } = useAuth();
  const queryClient = useQueryClient();
  const readOnly = !can(P.pricingManage);
  const [filters, setFilters] = useQueryStates(
    { q: parseAsString.withDefault(""), category: parseAsString, missing: parseAsBoolean.withDefault(false), overrides: parseAsBoolean.withDefault(false) },
    { history: "replace" },
  );
  const editor = useQuery({ queryKey: pricingKeys.editor(id), queryFn: () => pricingApi.getTierEditor(id) });
  const tiers = useQuery({ queryKey: pricingKeys.tiers(), queryFn: pricingApi.listTiers });
  const categories = useQuery({ queryKey: ["menu", "categories"], queryFn: menuApi.listCategories, enabled: can(P.catalogueRead) });
  const [edits, setEdits] = useState<Map<string, string>>(new Map());
  const [rowErrors, setRowErrors] = useState<Map<string, string>>(new Map());
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [editingTier, setEditingTier] = useState(false);

  const allRows = useMemo<GridRow[]>(
    () => [
      ...(editor.data?.dishes ?? []).map((item) => ({ key: `d:${item.id}`, kind: "dish" as const, item })),
      ...(editor.data?.options ?? []).map((item) => ({ key: `o:${item.id}`, kind: "option" as const, item })),
    ],
    [editor.data],
  );
  const changed = allRows.filter((r) => isChanged(r.item, edits.get(r.key)));
  const invalid = changed.some((r) => Number.isNaN(parseMoneyToCents(edits.get(r.key) ?? "")));
  useUnsavedChangesGuard(changed.length > 0);

  const category = useQuery({
    queryKey: ["menu", "categories", filters.category],
    queryFn: () => menuApi.getCategory(filters.category!),
    enabled: Boolean(filters.category) && can(P.catalogueRead),
  });
  const categoryDishes = useMemo(
    () => (filters.category && category.data ? new Set(category.data.items.map((i) => i.dishId)) : null),
    [category.data, filters.category],
  );
  const q = filters.q.trim().toLowerCase();
  const visible = allRows.filter(
    (r) =>
      (!q || r.item.name.toLowerCase().includes(q) || (r.item.sku ?? "").toLowerCase().includes(q)) &&
      (!filters.missing || r.item.effectiveCents === null) &&
      (!filters.overrides || sourceOf(r.item) === "OVERRIDE") &&
      (!categoryDishes || (r.kind === "dish" && categoryDishes.has(r.item.id))),
  );

  const save = useMutation({
    mutationFn: () => {
      const toOverride = (r: GridRow): PriceOverride => ({ itemId: r.item.id, priceCents: parseMoneyToCents(edits.get(r.key) ?? "") });
      return pricingApi.updatePrices(id, {
        dishOverrides: changed.filter((r) => r.kind === "dish").map(toOverride),
        optionOverrides: changed.filter((r) => r.kind === "option").map(toOverride),
      });
    },
    onSuccess: () => {
      toast.success(`${changed.length} price${changed.length === 1 ? "" : "s"} saved`);
      setEdits(new Map());
      setRowErrors(new Map());
      setFormErrors([]);
      void queryClient.invalidateQueries({ queryKey: pricingKeys.all });
      void queryClient.invalidateQueries({ queryKey: ["employees", "menu-preview"] });
    },
    onError: (error) => {
      const dishes = changed.filter((r) => r.kind === "dish");
      const options = changed.filter((r) => r.kind === "option");
      const byRow = new Map<string, string>();
      const rest: string[] = [];
      for (const message of isApiError(error) ? error.messages : [describeError(error)]) {
        const m = /^(dish|option)Overrides\.(\d+)/.exec(message);
        const row = m ? (m[1] === "dish" ? dishes : options)[Number(m[2])] : undefined;
        if (row) byRow.set(row.key, message);
        else rest.push(isApiError(error, 409) ? `${CONFLICT_MESSAGE} ${message}` : message);
      }
      setRowErrors(byRow);
      setFormErrors(rest);
      if (isApiError(error, 409)) void editor.refetch();
    },
  });

  const onEdit = (key: string, value: string | null) =>
    setEdits((current) => {
      const next = new Map(current);
      if (value === null) next.delete(key);
      else next.set(key, value);
      return next;
    });

  if (editor.isLoading) return <Skeleton className="m-6 h-[32rem]" />;
  if (editor.error || !editor.data)
    return (
      <main className="p-4 md:p-6">
        <ErrorState error={editor.error} title="Could not load this tier" onRetry={() => void editor.refetch()} />
      </main>
    );
  const tier = editor.data.tier;
  const dishRows = visible.filter((r) => r.kind === "dish");
  const optionRows = visible.filter((r) => r.kind === "option");

  return (
    <main className="flex flex-col gap-5 p-4 md:p-6">
      <PageHeader
        title={tier.name}
        description={
          <span>
            {strategyLabel(tier, tiers.data ?? [])}
            {tier.isDefault && " · default tier"}
            {!tier.isActive && " · inactive"}. Derived prices round up to the next 5 cents. Changes apply to new orders only.
          </span>
        }
        actions={!readOnly && <Button variant="outline" onClick={() => setEditingTier(true)}><Pencil data-icon="inline-start" /> Edit strategy</Button>}
      />
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full sm:w-64">
          <Search aria-hidden className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={filters.q} onChange={(e) => void setFilters({ q: e.target.value || null })} placeholder="Dish, option or SKU" aria-label="Search prices" className="pl-8" />
        </div>
        {categories.data && (
          <Select value={filters.category ?? ALL} onValueChange={(v) => void setFilters({ category: !v || v === ALL ? null : String(v) })}>
            <SelectTrigger aria-label="Category" className="min-w-44">
              <span className="text-muted-foreground">Category:</span>
              <SelectValue>{(v: string) => (v === ALL ? "All" : (categories.data.find((c) => c.id === v)?.name ?? "Category"))}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All</SelectItem>
              {categories.data.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        <label className="flex items-center gap-2 text-sm"><Switch checked={filters.missing} onCheckedChange={(on) => void setFilters({ missing: on || null })} /> Missing only</label>
        <label className="flex items-center gap-2 text-sm"><Switch checked={filters.overrides} onCheckedChange={(on) => void setFilters({ overrides: on || null })} /> Overrides only</label>
      </div>
      <FormErrorAlert messages={formErrors} />
      {visible.length === 0 ? (
        <EmptyState icon={Layers} title="Nothing matches" description="Clear a filter to see more prices." />
      ) : (
        <>
          {dishRows.length > 0 && <EditorGrid title="Dishes" rows={dishRows} edits={edits} errors={rowErrors} readOnly={readOnly} onEdit={onEdit} />}
          {optionRows.length > 0 && <EditorGrid title="Options" subtitle="Options are priced once per tier and shared by every dish that offers them." rows={optionRows} edits={edits} errors={rowErrors} readOnly={readOnly} onEdit={onEdit} />}
        </>
      )}
      {!readOnly && (
        <StickySaveBar
          visible={changed.length > 0}
          message={invalid ? "Fix the highlighted prices before saving" : `${changed.length} unsaved change${changed.length === 1 ? "" : "s"}`}
          saving={save.isPending}
          onDiscard={() => { setEdits(new Map()); setRowErrors(new Map()); }}
          onSave={() => !invalid && save.mutate()}
        />
      )}
      {editingTier && <TierDialog tier={tier} tiers={tiers.data ?? []} open onOpenChange={setEditingTier} />}
    </main>
  );
}
