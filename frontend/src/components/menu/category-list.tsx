"use client";

import { EyeOff } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { MenuCategorySummary } from "@/lib/api";
import { cn } from "@/lib/utils";
import { ReorderButtons } from "@/components/app/reorder-buttons";

type Props = {
  categories: MenuCategorySummary[];
  selectedId: string | null;
  canManage: boolean;
  pending: boolean;
  onSelect: (id: string) => void;
  onMove: (from: number, to: number) => void;
  onToggleActive: (category: MenuCategorySummary, isActive: boolean) => void;
};

export function CategoryList({ categories, selectedId, canManage, pending, onSelect, onMove, onToggleActive }: Props) {
  return (
    <ol className="flex flex-col gap-1">
      {categories.map((category, i) => {
        const hiddenFor = category.hiddenCompanyCount;
        return (
          <li
            key={category.id}
            className={cn("flex items-center gap-2 rounded-lg border bg-card px-2 py-2", selectedId === category.id && "border-primary bg-accent")}
          >
            <button type="button" onClick={() => onSelect(category.id)} className="min-w-0 flex-1 text-left" aria-current={selectedId === category.id ? "true" : undefined}>
              <span className={cn("flex items-center gap-1.5 font-medium", !category.isActive && "text-muted-foreground line-through")}>
                {category.name}
                {category.isSecret && (
                  <Tooltip>
                    <TooltipTrigger render={<span tabIndex={0} className="inline-flex items-center gap-0.5 rounded border bg-secondary px-1 text-[11px] font-normal text-secondary-foreground" />}>
                      <EyeOff className="size-3" /> Secret
                    </TooltipTrigger>
                    <TooltipContent>Not listed, but reachable by its link</TooltipContent>
                  </Tooltip>
                )}
              </span>
              <span className="block text-xs text-muted-foreground">
                {category._count.items} item{category._count.items === 1 ? "" : "s"}
                {hiddenFor > 0 && ` · Hidden from ${hiddenFor} compan${hiddenFor === 1 ? "y" : "ies"}`}
              </span>
            </button>
            {canManage && (
              <>
                <ReorderButtons label={category.name} index={i} count={categories.length} onMove={(to) => onMove(i, to)} disabled={pending} />
                <Switch aria-label={`${category.name} active`} checked={category.isActive} disabled={pending} onCheckedChange={(on) => onToggleActive(category, on)} />
              </>
            )}
          </li>
        );
      })}
    </ol>
  );
}
