"use client";

import { Flame, Snowflake, TriangleAlert, UtensilsCrossed } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { EmptyState } from "@/components/app/empty-state";
import type { MenuPreview } from "@/lib/api";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

/** The menu exactly as the preview endpoint returns it, in a phone-width frame. */
export function PreviewPhone({ menu }: { menu: MenuPreview }) {
  const [active, setActive] = useState<string | null>(null);
  const category = menu.categories.find((c) => c.id === active) ?? menu.categories[0];
  return (
    <div className="mx-auto w-full max-w-[420px] overflow-hidden rounded-[2rem] border-4 border-foreground/10 bg-background">
      <div className="border-b bg-card px-4 py-3">
        <p className="text-xs text-muted-foreground">Menu for</p>
        <p className="font-semibold">{menu.employee.name}</p>
      </div>
      {menu.categories.length === 0 ? (
        <EmptyState icon={UtensilsCrossed} title="Nothing to order" description="Every category is hidden, inactive or unpriced for this employee." />
      ) : (
        <>
          <nav aria-label="Preview categories" className="flex gap-1 overflow-x-auto border-b px-2 py-2">
            {menu.categories.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setActive(c.id)}
                className={cn("rounded-full px-3 py-1 text-sm whitespace-nowrap", c.id === category?.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}
              >
                {c.name}
              </button>
            ))}
          </nav>
          <ul className="flex max-h-[34rem] flex-col gap-3 overflow-y-auto p-3">
            {category?.dishes.map((dish) => (
              <li key={dish.id} className="flex gap-3 rounded-lg border bg-card p-2">
                <span className="relative size-16 shrink-0 overflow-hidden rounded-md bg-muted">
                  {dish.imageUrl && <Image src={dish.imageUrl} alt="" fill unoptimized sizes="64px" className="object-cover" />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="flex items-center gap-1 text-sm font-medium">
                      {dish.temperature === "HOT" ? <Flame className="size-3.5 text-warning" aria-label="Hot" /> : <Snowflake className="size-3.5 text-info" aria-label="Cold" />}
                      {dish.name}
                    </p>
                    <span className="num text-sm font-semibold">{formatMoney(dish.resolvedPriceCents)}</span>
                  </div>
                  <p className="line-clamp-2 text-xs text-muted-foreground">{dish.description}</p>
                  {dish.preferenceContext.allergenWarnings.length > 0 && (
                    <p className="mt-1 flex items-center gap-1 text-xs text-warning">
                      <TriangleAlert className="size-3" aria-hidden /> Contains {dish.preferenceContext.allergenWarnings.map((a) => a.name.toLowerCase()).join(", ")}
                    </p>
                  )}
                  {dish.optionGroups.length > 0 && (
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {dish.optionGroups.map((g) => `${g.name}${g.isRequired ? " (required)" : ""}`).join(" · ")}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
