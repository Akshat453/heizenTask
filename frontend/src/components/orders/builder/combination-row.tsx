"use client";

import { Trash2 } from "lucide-react";
import { QuantityStepper } from "@/components/app/quantity-stepper";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { MenuPreviewDish, MenuPreviewGroup } from "@/lib/api";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import { estimateUnitCents, type ComboDraft, type Selection } from "./model";

const NONE = "__none";

type Props = {
  index: number;
  dish: MenuPreviewDish;
  combo: ComboDraft;
  onChange: (combo: ComboDraft) => void;
  onRemove?: () => void;
};

function GroupControl({ group, selection, onSelect, idPrefix }: {
  group: MenuPreviewGroup;
  selection: Selection | undefined;
  onSelect: (selection: Selection | undefined) => void;
  idPrefix: string;
}) {
  const missing = group.isRequired && !selection;
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1 flex items-center gap-2 text-sm font-medium">
        {group.name}
        {group.isRequired ? (
          <span className={cn("rounded px-1.5 text-[11px] font-medium", missing ? "bg-warning-soft text-warning" : "bg-muted text-muted-foreground")}>Required</span>
        ) : (
          <span className="text-xs text-muted-foreground">Optional</span>
        )}
      </legend>
      <RadioGroup
        value={selection?.optionId ?? NONE}
        onValueChange={(value) => onSelect(value === NONE || !value ? undefined : { optionId: String(value), portionSizeId: selection?.portionSizeId })}
        className="grid gap-1.5 sm:grid-cols-2"
      >
        {!group.isRequired && (
          <label className="flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-sm has-data-checked:border-primary">
            <RadioGroupItem value={NONE} id={`${idPrefix}-none`} /> None
          </label>
        )}
        {group.options.map((option) => (
          <label key={option.id} className="flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-sm has-data-checked:border-primary">
            <RadioGroupItem value={option.id} id={`${idPrefix}-${option.id}`} />
            <span className="flex-1">{option.name}</span>
            <span className="num text-xs text-muted-foreground">+{formatMoney(option.resolvedPriceCents)}</span>
          </label>
        ))}
      </RadioGroup>
      {group.usesPortions && selection && (
        <div className="flex flex-col gap-1.5 pl-1">
          <Label className="text-xs text-muted-foreground">Portion</Label>
          <RadioGroup
            value={selection.portionSizeId ?? ""}
            onValueChange={(value) => onSelect({ optionId: selection.optionId, portionSizeId: value ? String(value) : undefined })}
            className="flex flex-wrap gap-1.5"
          >
            {group.portions.map((portion) => (
              <label key={portion.id} className="flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-sm has-data-checked:border-primary">
                <RadioGroupItem value={portion.id} id={`${idPrefix}-p-${portion.id}`} />
                {portion.name}
                <span className="num text-xs text-muted-foreground">+{formatMoney(portion.extraChargeCents)}</span>
              </label>
            ))}
          </RadioGroup>
        </div>
      )}
    </fieldset>
  );
}

/** One combination: an option per group, portions where the group uses them, and a quantity. */
export function CombinationRow({ index, dish, combo, onChange, onRemove }: Props) {
  const unit = estimateUnitCents(dish, combo);
  return (
    <div className="flex flex-col gap-4 rounded-lg border bg-card p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="label-caps text-muted-foreground">Combination {index + 1}</p>
        <div className="flex items-center gap-2">
          <QuantityStepper label={`Combination ${index + 1} quantity`} value={combo.quantity} min={0} onChange={(quantity) => onChange({ ...combo, quantity })} />
          {onRemove && (
            <Button type="button" variant="ghost" size="icon-sm" aria-label={`Remove combination ${index + 1}`} onClick={onRemove}>
              <Trash2 />
            </Button>
          )}
        </div>
      </div>
      {dish.optionGroups.length === 0 && <p className="text-sm text-muted-foreground">This dish has no options.</p>}
      {dish.optionGroups.map((group) => (
        <GroupControl
          key={group.id}
          idPrefix={`${combo.key}-${group.id}`}
          group={group}
          selection={combo.selections[group.id]}
          onSelect={(selection) => onChange({ ...combo, selections: { ...combo.selections, [group.id]: selection } })}
        />
      ))}
      <p className="text-right text-sm text-muted-foreground">
        {unit === null ? "Price shown after saving" : (
          <>
            <span className="num">{formatMoney(unit)}</span> × <span className="num">{combo.quantity}</span> ={" "}
            <span className="num font-medium text-foreground">{formatMoney(unit * combo.quantity)}</span> est.
          </>
        )}
      </p>
    </div>
  );
}
