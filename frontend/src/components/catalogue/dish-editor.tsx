"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Ban, Flame, Plus, RotateCcw, Snowflake } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { ChipMultiSelect } from "@/components/app/chip-multi-select";
import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { FormErrorAlert } from "@/components/app/form-error-alert";
import { FormSection, SectionIndex, StickySaveBar } from "@/components/app/form-layout";
import { StatusBadge } from "@/components/app/status-badge";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useUnsavedChangesGuard } from "@/hooks/use-unsaved-changes";
import { catalogueApi, type Dish, type DishWriteInput } from "@/lib/api";
import { CONFLICT_MESSAGE, isApiError } from "@/lib/api-client";
import { P } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { draftFromDish, emptyDish, groupKey, mapDishErrors, toDishInput, type DishDraft, type DraftProblems } from "./dish-form-model";
import { GroupEditor } from "./group-editor";
import { catalogueKeys, useCatalogueReference } from "./queries";
import { move } from "@/components/app/reorder-buttons";
import { TierPrices } from "./tier-prices";

const NO_STATION = "__none";

function Field({ id, label, error, hint, children }: { id: string; label: string; error?: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}

/** Create (no `dish`) or edit a dish. One scrolling form with a sticky save bar while dirty. */
export function DishEditor({ dish }: { dish?: Dish }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { can } = useAuth();
  const readOnly = !can(P.catalogueManage);
  const ref = useCatalogueReference();
  const [initial] = useState<DishDraft>(() => (dish ? draftFromDish(dish) : emptyDish()));
  const [draft, setDraft] = useState<DishDraft>(initial);
  const [problems, setProblems] = useState<DraftProblems>({ fields: {}, groups: {}, form: [] });
  const [confirm, setConfirm] = useState<"deactivate" | "reactivate" | null>(null);
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial);
  useUnsavedChangesGuard(dirty && !readOnly);
  const set = (patch: Partial<DishDraft>) => setDraft((d) => ({ ...d, ...patch }));

  const save = useMutation({
    mutationFn: (input: DishWriteInput) => (dish ? catalogueApi.updateDish(dish.id, input) : catalogueApi.createDish(input)),
    onSuccess: (saved) => {
      toast.success(dish ? "Dish saved" : "Dish created");
      setProblems({ fields: {}, groups: {}, form: [] });
      void queryClient.invalidateQueries({ queryKey: catalogueKeys.all });
      void queryClient.invalidateQueries({ queryKey: ["pricing"] });
      router.replace(`/catalogue/dishes/${saved.id}`);
    },
    onError: (error) => {
      if (isApiError(error, 409)) toast.error(CONFLICT_MESSAGE, { description: error.message });
      setProblems(mapDishErrors(error, draft));
    },
  });
  const status = useMutation({
    mutationFn: (to: "deactivate" | "reactivate") => (to === "deactivate" ? catalogueApi.deactivateDish(dish!.id) : catalogueApi.reactivateDish(dish!.id)),
    onSuccess: (_r, to) => {
      toast.success(to === "deactivate" ? "Dish deactivated" : "Dish reactivated");
      setConfirm(null);
      void queryClient.invalidateQueries({ queryKey: catalogueKeys.all });
    },
    onError: (error) => {
      setConfirm(null);
      toast.error(isApiError(error, 409) ? CONFLICT_MESSAGE : error.message);
    },
  });

  const sections = [
    { id: "details", label: "Details" },
    { id: "preferences", label: "Allergens & dietary" },
    { id: "groups", label: "Option groups" },
    ...(dish && can(P.pricingRead) ? [{ id: "prices", label: "Prices on tiers" }] : []),
    ...(dish ? [{ id: "status", label: "Status" }] : []),
  ];
  const f = problems.fields;

  return (
    <div className="flex gap-6">
      <SectionIndex sections={sections} />
      <form
        id="dish-form"
        className="flex min-w-0 flex-1 flex-col gap-6"
        onSubmit={(e) => {
          e.preventDefault();
          if (readOnly) return;
          const built = toDishInput(draft);
          if ("problems" in built) setProblems(built.problems);
          else save.mutate(built.input);
        }}
      >
        <FormErrorAlert messages={problems.form} />
        <FormSection id="details" title="Details">
          <fieldset disabled={readOnly} className="grid gap-4 md:grid-cols-[1fr_12rem]">
            <div className="flex flex-col gap-4">
              <Field id="d-name" label="Name" error={f.name}>
                <Input id="d-name" value={draft.name} onChange={(e) => set({ name: e.target.value })} aria-invalid={Boolean(f.name)} />
              </Field>
              <Field id="d-desc" label="Description" error={f.description}>
                <Textarea id="d-desc" value={draft.description} onChange={(e) => set({ description: e.target.value })} />
              </Field>
              <Field id="d-image" label="Image URL" error={f.imageUrl}>
                <Input id="d-image" type="url" value={draft.imageUrl} onChange={(e) => set({ imageUrl: e.target.value })} placeholder="https://…" aria-invalid={Boolean(f.imageUrl)} />
              </Field>
            </div>
            <div className="relative aspect-square w-full overflow-hidden rounded-lg border bg-muted md:self-start">
              {/^https?:\/\//.test(draft.imageUrl) ? <Image src={draft.imageUrl} alt="Image preview" fill unoptimized className="object-cover" /> : <p className="grid h-full place-items-center text-xs text-muted-foreground">No image</p>}
            </div>
            <div className="grid gap-4 sm:grid-cols-2 md:col-span-2 lg:grid-cols-4">
              <Field id="d-sku" label="SKU" error={f.sku}>
                <Input id="d-sku" className="num" value={draft.sku} onChange={(e) => set({ sku: e.target.value })} aria-invalid={Boolean(f.sku)} />
              </Field>
              <Field id="d-cost" label="Cost price" error={f.cost} hint="In rupees, e.g. 105.50">
                <Input id="d-cost" className="num" inputMode="decimal" value={draft.cost} onChange={(e) => set({ cost: e.target.value })} aria-invalid={Boolean(f.cost)} />
              </Field>
              <Field id="d-min" label="Minimum order quantity" error={f.minQty} hint="Optional">
                <Input id="d-min" className="num" inputMode="numeric" value={draft.minQty} onChange={(e) => set({ minQty: e.target.value })} aria-invalid={Boolean(f.minQty)} />
              </Field>
              <Field id="d-station" label="Kitchen station">
                <Select value={draft.stationId ?? NO_STATION} onValueChange={(v) => set({ stationId: !v || v === NO_STATION ? null : String(v) })}>
                  <SelectTrigger id="d-station" className="w-full">
                    <SelectValue>{(v: string) => (v === NO_STATION ? "Unassigned" : (ref.stations.data?.find((s) => s.id === v)?.name ?? "Station"))}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_STATION}>Unassigned</SelectItem>
                    {(ref.stations.data ?? []).filter((s) => s.isActive || s.id === draft.stationId).map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <div className="flex flex-col gap-1.5 md:col-span-2">
              <span className="text-sm font-medium">Temperature</span>
              <div role="group" aria-label="Temperature" className="inline-flex w-fit rounded-lg border bg-card p-0.5">
                {(["HOT", "COLD"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    aria-pressed={draft.temperature === t}
                    onClick={() => set({ temperature: t })}
                    className={cn("flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm", draft.temperature === t ? "bg-primary text-primary-foreground" : "text-muted-foreground")}
                  >
                    {t === "HOT" ? <Flame className="size-4" /> : <Snowflake className="size-4" />} {t === "HOT" ? "Hot" : "Cold"}
                  </button>
                ))}
              </div>
            </div>
          </fieldset>
        </FormSection>

        <FormSection id="preferences" title="Allergens and dietary tags" description="Employees with a matching allergy see a warning; it never blocks ordering.">
          <ChipMultiSelect label="Allergens" tone="warning" options={ref.allergens.data ?? []} value={draft.allergenIds} onChange={(allergenIds) => set({ allergenIds })} disabled={readOnly} />
          <ChipMultiSelect label="Dietary tags" options={ref.dietaryTags.data ?? []} value={draft.dietaryTagIds} onChange={(dietaryTagIds) => set({ dietaryTagIds })} disabled={readOnly} />
        </FormSection>

        <FormSection id="groups" title="Option groups" description="Groups appear on the order in this order. A required group needs exactly one choice; an optional one allows none or one.">
          {draft.groups.length === 0 && <p className="text-sm text-muted-foreground">No option groups. The dish is ordered as is.</p>}
          {draft.groups.map((group, i) => (
            <GroupEditor
              key={group.key}
              group={group}
              index={i}
              count={draft.groups.length}
              portions={ref.portions.data ?? []}
              problems={problems.groups[i]}
              readOnly={readOnly}
              onChange={(next) => set({ groups: draft.groups.map((g) => (g.key === next.key ? next : g)) })}
              onMove={(to) => set({ groups: move(draft.groups, i, to) })}
              onRemove={() => set({ groups: draft.groups.filter((g) => g.key !== group.key) })}
            />
          ))}
          {!readOnly && (
            <Button type="button" variant="outline" className="w-fit" onClick={() => set({ groups: [...draft.groups, { key: groupKey(), name: "", isRequired: false, usesPortions: false, options: [], portions: [] }] })}>
              <Plus data-icon="inline-start" /> Add option group
            </Button>
          )}
        </FormSection>

        {dish && can(P.pricingRead) && (
          <FormSection id="prices" title="Prices on tiers" description="Resolved by the server for each tier. Edit them in the tier editor.">
            <TierPrices itemId={dish.id} kind="dishes" />
          </FormSection>
        )}

        {dish && (
          <FormSection id="status" title="Status">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <StatusBadge kind="active" value={dish.isActive ? "ACTIVE" : "INACTIVE"} />
              {!readOnly &&
                (dish.isActive ? (
                  <Button type="button" variant="danger" onClick={() => setConfirm("deactivate")}>
                    <Ban data-icon="inline-start" /> Deactivate dish
                  </Button>
                ) : (
                  <Button type="button" variant="outline" onClick={() => setConfirm("reactivate")}>
                    <RotateCcw data-icon="inline-start" /> Reactivate dish
                  </Button>
                ))}
            </div>
          </FormSection>
        )}

        {!readOnly && (
          <StickySaveBar
            visible={dirty || !dish}
            message={dish ? "Unsaved changes" : "New dish, not saved yet"}
            saving={save.isPending}
            form="dish-form"
            saveLabel={dish ? "Save changes" : "Create dish"}
            onDiscard={() => (dish ? setDraft(initial) : router.push("/catalogue"))}
          />
        )}
      </form>

      <ConfirmDialog
        open={confirm === "deactivate"}
        onOpenChange={(o) => !o && setConfirm(null)}
        title="Deactivate this dish?"
        description="Deactivated dishes disappear from menus. Past orders keep their records. You can reactivate it later."
        confirmLabel="Deactivate dish"
        destructive
        pending={status.isPending}
        onConfirm={() => status.mutate("deactivate")}
      />
      <ConfirmDialog
        open={confirm === "reactivate"}
        onOpenChange={(o) => !o && setConfirm(null)}
        title="Reactivate this dish?"
        description="It appears again on menus where it is listed, hidden for no company, and priced on the employee's tier."
        confirmLabel="Reactivate dish"
        pending={status.isPending}
        onConfirm={() => status.mutate("reactivate")}
      />
    </div>
  );
}
