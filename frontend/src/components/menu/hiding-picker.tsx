"use client";

import { EyeOff } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { useCompanyOptions, useSetHiding } from "./queries";

type Props = { kind: "category" | "dish"; itemId: string; itemName: string; hiddenBy: string[]; canEdit: boolean };

/** "Hidden from N companies"; the picker replaces the whole set with one request. */
export function HidingPicker({ kind, itemId, itemName, hiddenBy, canEdit }: Props) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set(hiddenBy));
  const companies = useCompanyOptions(open);
  const save = useSetHiding(kind);
  const label = hiddenBy.length ? `Hidden from ${hiddenBy.length} compan${hiddenBy.length === 1 ? "y" : "ies"}` : "Shown to all companies";
  if (!canEdit)
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        {hiddenBy.length > 0 && <EyeOff className="size-3" aria-hidden />}
        {label}
      </span>
    );
  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setSelected(new Set(hiddenBy));
      }}
    >
      <PopoverTrigger render={<Button variant="ghost" size="xs" className="text-muted-foreground" />}>
        {hiddenBy.length > 0 && <EyeOff data-icon="inline-start" />}
        {label}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 shadow-soft">
        <p className="text-sm font-medium">Hide {itemName} from</p>
        <p className="mb-2 text-xs text-muted-foreground">
          {kind === "dish" ? "Employees of these companies will not see this dish on any menu." : "Employees of these companies will not see this category."}
        </p>
        {companies.isLoading ? (
          <Skeleton className="h-24" />
        ) : (
          <ul className="flex max-h-64 flex-col gap-1 overflow-y-auto">
            {(companies.data ?? []).map((c) => (
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
        )}
        <Button className="mt-3 w-full" size="sm" disabled={save.isPending || companies.isLoading} onClick={() => save.mutate({ id: itemId, companyIds: [...selected] }, { onSettled: () => setOpen(false) })}>
          {save.isPending ? "Saving…" : "Apply"}
        </Button>
      </PopoverContent>
    </Popover>
  );
}
