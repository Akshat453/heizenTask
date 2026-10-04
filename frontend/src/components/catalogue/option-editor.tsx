"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { ChipMultiSelect } from "@/components/app/chip-multi-select";
import { FormErrorAlert } from "@/components/app/form-error-alert";
import { FormSection, StickySaveBar } from "@/components/app/form-layout";
import { useAuth } from "@/components/auth/auth-provider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useUnsavedChangesGuard } from "@/hooks/use-unsaved-changes";
import { catalogueApi, type Option, type OptionWriteInput } from "@/lib/api";
import { CONFLICT_MESSAGE, describeError, isApiError } from "@/lib/api-client";
import { centsToInput, parseMoneyToCents } from "@/lib/decimal-input";
import { P } from "@/lib/permissions";
import { catalogueKeys, useCatalogueReference } from "./queries";
import { TierPrices } from "./tier-prices";

type Draft = { name: string; cost: string; isActive: boolean; allergenIds: string[]; dietaryTagIds: string[] };

export function OptionEditor({ option }: { option?: Option }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { can } = useAuth();
  const readOnly = !can(P.catalogueManage);
  const ref = useCatalogueReference();
  const [initial] = useState<Draft>(() => ({
    name: option?.name ?? "",
    cost: centsToInput(option?.costCents),
    isActive: option?.isActive ?? true,
    allergenIds: option?.allergens.map((a) => a.allergen.id) ?? [],
    dietaryTagIds: option?.dietaryTags.map((t) => t.dietaryTag.id) ?? [],
  }));
  const [draft, setDraft] = useState(initial);
  const [errors, setErrors] = useState<{ name?: string; cost?: string; form: string[] }>({ form: [] });
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial);
  useUnsavedChangesGuard(dirty && !readOnly);

  const save = useMutation({
    mutationFn: (input: OptionWriteInput) => (option ? catalogueApi.updateOption(option.id, input) : catalogueApi.createOption(input)),
    onSuccess: (saved) => {
      toast.success(option ? "Option saved" : "Option created");
      void queryClient.invalidateQueries({ queryKey: catalogueKeys.all });
      router.replace(`/catalogue/options/${saved.id}`);
    },
    onError: (error) => {
      if (isApiError(error, 409)) toast.error(CONFLICT_MESSAGE, { description: error.message });
      const messages = isApiError(error) ? error.messages : [describeError(error)];
      setErrors({
        name: messages.find((m) => m.startsWith("name ")),
        cost: messages.find((m) => m.startsWith("costCents ")),
        form: messages.filter((m) => !m.startsWith("name ") && !m.startsWith("costCents ")),
      });
    },
  });

  const submit = () => {
    const cost = parseMoneyToCents(draft.cost);
    const next = { name: draft.name.trim() ? undefined : "Enter a name.", cost: cost === null || Number.isNaN(cost) ? "Enter a cost like 12.50." : undefined, form: [] };
    setErrors(next);
    if (next.name || next.cost) return;
    save.mutate({ name: draft.name.trim(), costCents: cost as number, isActive: draft.isActive, allergenIds: draft.allergenIds, dietaryTagIds: draft.dietaryTagIds });
  };

  return (
    <form
      id="option-form"
      className="flex max-w-3xl flex-col gap-6"
      onSubmit={(e) => {
        e.preventDefault();
        if (!readOnly) submit();
      }}
    >
      <FormErrorAlert messages={errors.form} />
      <FormSection id="details" title="Details">
        <fieldset disabled={readOnly} className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="o-name">Name</Label>
            <Input id="o-name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} aria-invalid={Boolean(errors.name)} />
            {errors.name && <p className="text-xs text-danger">{errors.name}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="o-cost">Cost price</Label>
            <Input id="o-cost" className="num" inputMode="decimal" value={draft.cost} onChange={(e) => setDraft({ ...draft, cost: e.target.value })} aria-invalid={Boolean(errors.cost)} />
            {errors.cost ? <p className="text-xs text-danger">{errors.cost}</p> : <p className="text-xs text-muted-foreground">In rupees, e.g. 12.50</p>}
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={draft.isActive} onCheckedChange={(isActive) => setDraft({ ...draft, isActive })} /> Active (inactive options cannot be chosen on new orders)
          </label>
        </fieldset>
      </FormSection>
      <FormSection id="preferences" title="Allergens and dietary tags">
        <ChipMultiSelect label="Allergens" tone="warning" options={ref.allergens.data ?? []} value={draft.allergenIds} onChange={(allergenIds) => setDraft({ ...draft, allergenIds })} disabled={readOnly} />
        <ChipMultiSelect label="Dietary tags" options={ref.dietaryTags.data ?? []} value={draft.dietaryTagIds} onChange={(dietaryTagIds) => setDraft({ ...draft, dietaryTagIds })} disabled={readOnly} />
      </FormSection>
      {option && can(P.pricingRead) && (
        <FormSection id="prices" title="Prices on tiers" description="Portion sizes are set per option group on each dish.">
          <TierPrices itemId={option.id} kind="options" />
        </FormSection>
      )}
      {!readOnly && (
        <StickySaveBar
          visible={dirty || !option}
          message={option ? "Unsaved changes" : "New option, not saved yet"}
          saving={save.isPending}
          form="option-form"
          saveLabel={option ? "Save changes" : "Create option"}
          onDiscard={() => (option ? setDraft(initial) : router.push("/catalogue?tab=options"))}
        />
      )}
    </form>
  );
}
