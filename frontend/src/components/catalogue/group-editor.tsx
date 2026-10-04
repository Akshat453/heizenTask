"use client";

import { Trash2, X } from "lucide-react";
import { EntityCombobox } from "@/components/app/entity-combobox";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { catalogueApi, type OrderedReference } from "@/lib/api";
import type { GroupDraft } from "./dish-form-model";
import { move, ReorderButtons } from "@/components/app/reorder-buttons";

type Props = {
  group: GroupDraft;
  index: number;
  count: number;
  portions: OrderedReference[];
  problems?: string[];
  readOnly: boolean;
  onChange: (group: GroupDraft) => void;
  onMove: (to: number) => void;
  onRemove: () => void;
};

export function GroupEditor({ group, index, count, portions, problems = [], readOnly, onChange, onMove, onRemove }: Props) {
  const set = (patch: Partial<GroupDraft>) => onChange({ ...group, ...patch });
  const portionOn = (id: string) => group.portions.find((p) => p.portionSizeId === id);
  const togglePortion = (portion: OrderedReference, on: boolean) =>
    set({
      portions: on
        ? [...group.portions, { portionSizeId: portion.id, extra: "0.00" }].sort(
            (a, b) => (portions.find((p) => p.id === a.portionSizeId)?.displayOrder ?? 0) - (portions.find((p) => p.id === b.portionSizeId)?.displayOrder ?? 0),
          )
        : group.portions.filter((p) => p.portionSizeId !== portion.id),
    });

  return (
    <fieldset disabled={readOnly} className={`flex flex-col gap-4 rounded-lg border p-4 ${problems.length ? "border-danger/40" : ""}`}>
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex min-w-48 flex-1 flex-col gap-1.5">
          <Label htmlFor={`${group.key}-name`}>Group {index + 1} name</Label>
          <Input id={`${group.key}-name`} value={group.name} onChange={(e) => set({ name: e.target.value })} placeholder="e.g. Protein" />
        </div>
        <label className="flex h-9 items-center gap-2 text-sm">
          <Switch checked={group.isRequired} onCheckedChange={(isRequired) => set({ isRequired })} /> Required
        </label>
        <label className="flex h-9 items-center gap-2 text-sm">
          <Switch checked={group.usesPortions} onCheckedChange={(usesPortions) => set({ usesPortions })} /> Sell in portion sizes
        </label>
        {!readOnly && (
          <span className="ml-auto flex items-center">
            <ReorderButtons label={`group ${group.name || index + 1}`} index={index} count={count} onMove={onMove} />
            <Button type="button" variant="ghost" size="icon-sm" aria-label={`Remove group ${group.name || index + 1}`} onClick={onRemove}>
              <Trash2 />
            </Button>
          </span>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium">Options</p>
        {group.options.length === 0 && <p className="text-sm text-muted-foreground">No options yet.</p>}
        <ol className="flex flex-col gap-1">
          {group.options.map((option, i) => (
            <li key={option.optionId} className="flex items-center gap-2 rounded-md border bg-background px-2 py-1 text-sm">
              <span className="num w-5 text-muted-foreground">{i + 1}</span>
              <span className="flex-1">{option.name}</span>
              {!readOnly && (
                <>
                  <ReorderButtons label={option.name} index={i} count={group.options.length} onMove={(to) => set({ options: move(group.options, i, to) })} />
                  <Button type="button" variant="ghost" size="icon-sm" aria-label={`Remove ${option.name}`} onClick={() => set({ options: group.options.filter((o) => o.optionId !== option.optionId) })}>
                    <X />
                  </Button>
                </>
              )}
            </li>
          ))}
        </ol>
        {!readOnly && (
          <EntityCombobox
            className="max-w-sm"
            label="Option"
            placeholder="Add an existing option…"
            queryKey="options"
            value={null}
            onChange={(item) => item && !group.options.some((o) => o.optionId === item.id) && set({ options: [...group.options, { optionId: item.id, name: item.label }] })}
            search={async (term) =>
              (await catalogueApi.searchOptions({ search: term || undefined, pageSize: 10 })).data
                .filter((o) => o.isActive)
                .map((o) => ({ id: o.id, label: o.name }))
            }
          />
        )}
      </div>

      {group.usesPortions && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">Portion sizes and extra charge</p>
          <p className="text-xs text-muted-foreground">Every option in this group is sold in the sizes you tick; the server rejects combinations that are not allowed.</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {portions.filter((p) => p.isActive || portionOn(p.id)).map((portion) => {
              const selected = portionOn(portion.id);
              return (
                <div key={portion.id} className="flex items-center gap-2 rounded-md border px-2 py-1.5">
                  <label className="flex flex-1 items-center gap-2 text-sm">
                    <Checkbox checked={Boolean(selected)} onCheckedChange={(on) => togglePortion(portion, Boolean(on))} /> {portion.name}
                  </label>
                  {selected && (
                    <Input
                      aria-label={`${portion.name} extra charge`}
                      inputMode="decimal"
                      value={selected.extra}
                      onChange={(e) => set({ portions: group.portions.map((p) => (p.portionSizeId === portion.id ? { ...p, extra: e.target.value } : p)) })}
                      className="num h-8 w-24 text-right"
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
      {problems.length > 0 && (
        <ul className="list-disc rounded-md border border-danger/30 bg-danger-soft py-2 pr-3 pl-7 text-sm text-danger">
          {problems.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      )}
    </fieldset>
  );
}
