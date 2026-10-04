"use client";

import { EyeOff } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { HidingIndex } from "./queries";
import { useUpdateHiding } from "./queries";

type Props = { kind: "category" | "dish"; itemId: string; itemName: string; index: HidingIndex | undefined; canEdit: boolean };

/** "Hidden from N companies" with a picker to change which companies hide it. */
export function HidingPicker({ kind, itemId, itemName, index, canEdit }: Props) {
  const current = (kind === "category" ? index?.categories : index?.dishes)?.get(itemId) ?? new Set<string>();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(current);
  const update = useUpdateHiding(kind);
  const label = current.size ? `Hidden from ${current.size} compan${current.size === 1 ? "y" : "ies"}` : "Shown to all companies";
  if (!index) return null;
  if (!canEdit) return <span className="text-xs text-muted-foreground">{label}</span>;
  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setSelected(new Set(current));
      }}
    >
      <PopoverTrigger render={<Button variant="ghost" size="xs" className="text-muted-foreground" />}>
        {current.size > 0 && <EyeOff data-icon="inline-start" />}
        {label}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 shadow-soft">
        <p className="text-sm font-medium">Hide {itemName} from</p>
        <p className="mb-2 text-xs text-muted-foreground">Employees of these companies will not see it.</p>
        <ul className="flex max-h-64 flex-col gap-1 overflow-y-auto">
          {index.companies.map((c) => (
            <li key={c.id}>
              <label className="flex items-center gap-2 rounded px-1 py-1 text-sm hover:bg-muted">
                <Checkbox
                  checked={selected.has(c.id)}
                  onCheckedChange={(on) => {
                    const next = new Set(selected);
                    if (on) next.add(c.id);
                    else next.delete(c.id);
                    setSelected(next);
                  }}
                />
                {c.name}
              </label>
            </li>
          ))}
        </ul>
        <Button
          className="mt-3 w-full"
          size="sm"
          disabled={update.isPending}
          onClick={() => update.mutate({ itemId, index, companyIds: selected }, { onSettled: () => setOpen(false) })}
        >
          {update.isPending ? "Saving…" : "Apply"}
        </Button>
      </PopoverContent>
    </Popover>
  );
}
