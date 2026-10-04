"use client";

import { Flame, Pencil, Plus, Snowflake, TriangleAlert, UtensilsCrossed } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { EmptyState } from "@/components/app/empty-state";
import { ErrorState } from "@/components/app/error-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { MenuPreviewDish } from "@/lib/api";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { LineDraft } from "./model";
import type { BuilderData } from "./use-builder-data";

type Props = { data: BuilderData; lines: LineDraft[]; onConfigure: (dish: MenuPreviewDish) => void };

function DishCard({ dish, inOrder, onConfigure }: { dish: MenuPreviewDish; inOrder?: LineDraft; onConfigure: () => void }) {
  const warnings = dish.preferenceContext.allergenWarnings;
  return (
    <article className="flex flex-col overflow-hidden rounded-lg border bg-card">
      <div className="relative aspect-[16/9] bg-muted">
        {dish.imageUrl && <Image src={dish.imageUrl} alt="" fill unoptimized sizes="(min-width: 1024px) 25vw, 100vw" className="object-cover" />}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="flex items-center gap-1.5 font-medium">
            {dish.temperature === "HOT" ? <Flame className="size-3.5 text-warning" aria-label="Hot" /> : <Snowflake className="size-3.5 text-info" aria-label="Cold" />}
            {dish.name}
          </h3>
          <span className="num shrink-0 text-sm font-semibold">{formatMoney(dish.resolvedPriceCents)}</span>
        </div>
        <p className="line-clamp-2 text-xs text-muted-foreground">{dish.description}</p>
        <div className="flex flex-wrap gap-1">
          {dish.dietaryTags.map(({ dietaryTag }) => (
            <span key={dietaryTag.id} className="rounded-md border bg-secondary px-1.5 text-[11px] text-secondary-foreground">
              {dietaryTag.name}
            </span>
          ))}
          {warnings.map((allergen) => (
            <span key={allergen.id} className="inline-flex items-center gap-1 rounded-md border border-warning/20 bg-warning-soft px-1.5 text-[11px] text-warning">
              <TriangleAlert className="size-3" aria-hidden /> Contains {allergen.name.toLowerCase()}
            </span>
          ))}
        </div>
        <div className="mt-auto flex items-center justify-between pt-1">
          {dish.minimumOrderQuantity ? <span className="text-xs text-muted-foreground">Min {dish.minimumOrderQuantity}</span> : <span />}
          <Button size="sm" variant={inOrder ? "outline" : "default"} onClick={onConfigure}>
            {inOrder ? <Pencil data-icon="inline-start" /> : <Plus data-icon="inline-start" />}
            {inOrder ? `In order (${inOrder.quantity}) · Edit` : "Add"}
          </Button>
        </div>
      </div>
    </article>
  );
}

export function StepDishes({ data, lines, onConfigure }: Props) {
  const menu = data.menu;
  const categories = menu.data?.categories ?? [];
  const [active, setActive] = useState<string | null>(null);
  const current = categories.find((c) => c.id === active) ?? categories[0];

  if (menu.isLoading)
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-busy="true">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-64" />
        ))}
      </div>
    );
  if (menu.error) return <ErrorState error={menu.error} title="Could not load this employee's menu" onRetry={() => void menu.refetch()} />;
  if (categories.length === 0)
    return (
      <EmptyState
        icon={UtensilsCrossed}
        title="Nothing on this employee's menu"
        description="Every dish is hidden for their company, inactive or unpriced on their tier. Check the menu and pricing pages."
      />
    );

  return (
    <div className="flex flex-col gap-4 md:flex-row">
      <nav aria-label="Menu categories" className="flex shrink-0 gap-1 overflow-x-auto md:w-48 md:flex-col">
        {categories.map((category) => (
          <button
            key={category.id}
            type="button"
            onClick={() => setActive(category.id)}
            aria-current={current?.id === category.id ? "true" : undefined}
            className={cn(
              "rounded-md px-3 py-2 text-left text-sm whitespace-nowrap hover:bg-muted",
              current?.id === category.id && "bg-accent font-medium text-accent-foreground",
            )}
          >
            {category.name}
            <span className="num ml-1 text-xs text-muted-foreground">{category.dishes.length}</span>
          </button>
        ))}
      </nav>
      <div className="grid min-w-0 flex-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {current?.dishes.map((dish) => (
          <DishCard key={dish.id} dish={dish} inOrder={lines.find((l) => l.dishId === dish.id)} onConfigure={() => onConfigure(dish)} />
        ))}
      </div>
    </div>
  );
}
