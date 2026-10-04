"use client";

import { CircleCheck, Flame, Plus, Snowflake, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { QuantityStepper } from "@/components/app/quantity-stepper";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { MenuPreviewDish } from "@/lib/api";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import { CombinationRow } from "./combination-row";
import { emptyCombo, estimateLineCents, lineProblems, newKey, type LineDraft } from "./model";

type Props = {
  dish: MenuPreviewDish;
  /** Existing line to edit, or undefined to add. */
  initial?: LineDraft;
  onSave: (line: LineDraft) => void;
  onClose: () => void;
  /** Server messages for this line from the last save attempt. */
  serverErrors?: string[];
};

function initialLine(dish: MenuPreviewDish, initial?: LineDraft): LineDraft {
  if (initial) return initial;
  const quantity = dish.minimumOrderQuantity ?? 1;
  return { key: newKey(), dishId: dish.id, dishName: dish.name, quantity, combinations: [emptyCombo(quantity)] };
}

/** Sheet to configure one dish line: quantity, then combinations that must add up to it. */
export function DishConfigurator({ dish, initial, onSave, onClose, serverErrors = [] }: Props) {
  const [line, setLine] = useState<LineDraft>(() => initialLine(dish, initial));
  const allocated = line.combinations.reduce((sum, c) => sum + c.quantity, 0);
  const exact = allocated === line.quantity && line.quantity > 0;
  const problems = lineProblems(dish, line);
  const estimate = estimateLineCents(dish, line);

  const setQuantity = (quantity: number) =>
    setLine((current) => ({
      ...current,
      quantity,
      // With a single combination, it simply holds the whole quantity.
      combinations: current.combinations.length === 1 ? [{ ...current.combinations[0], quantity }] : current.combinations,
    }));

  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full gap-0 sm:max-w-xl">
        <SheetHeader className="border-b">
          <SheetTitle className="flex items-center gap-2">
            {dish.temperature === "HOT" ? <Flame className="size-4 text-warning" aria-label="Hot" /> : <Snowflake className="size-4 text-info" aria-label="Cold" />}
            {dish.name}
          </SheetTitle>
          <SheetDescription>
            <span className="num">{formatMoney(dish.resolvedPriceCents)}</span> base price on this employee&apos;s tier
            {dish.minimumOrderQuantity ? ` · minimum ${dish.minimumOrderQuantity}` : ""}
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium">Quantity</p>
              {dish.minimumOrderQuantity && <p className="text-xs text-muted-foreground">Minimum {dish.minimumOrderQuantity}</p>}
            </div>
            <QuantityStepper label="Dish quantity" value={line.quantity} min={1} onChange={setQuantity} />
          </div>

          <div className={cn("rounded-lg border p-3", exact ? "border-success/30 bg-success-soft" : "border-warning/30 bg-warning-soft")} role="status">
            <p className={cn("flex items-center gap-2 text-sm font-medium", exact ? "text-success" : "text-warning")}>
              {exact ? <CircleCheck className="size-4" /> : <TriangleAlert className="size-4" />}
              {exact ? `All ${line.quantity} allocated` : `${allocated} of ${line.quantity} allocated`}
            </p>
            <Progress value={line.quantity ? Math.min(100, (allocated / line.quantity) * 100) : 0} className="mt-2" aria-label="Allocated" />
          </div>

          {line.combinations.map((combo, index) => (
            <CombinationRow
              key={combo.key}
              index={index}
              dish={dish}
              combo={combo}
              onChange={(next) => setLine((current) => ({ ...current, combinations: current.combinations.map((c) => (c.key === next.key ? next : c)) }))}
              onRemove={
                line.combinations.length > 1
                  ? () => setLine((current) => ({ ...current, combinations: current.combinations.filter((c) => c.key !== combo.key) }))
                  : undefined
              }
            />
          ))}
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              setLine((current) => ({ ...current, combinations: [...current.combinations, emptyCombo(Math.max(0, current.quantity - allocated))] }))
            }
          >
            <Plus data-icon="inline-start" /> Split into another combination
          </Button>

          {(problems.length > 0 || serverErrors.length > 0) && (
            <ul className="flex flex-col gap-1 rounded-lg border border-warning/30 bg-warning-soft p-3 text-sm text-warning" aria-live="polite">
              {[...serverErrors, ...problems].map((problem) => (
                <li key={problem}>{problem}</li>
              ))}
            </ul>
          )}
        </div>

        <SheetFooter className="flex-row items-center justify-between border-t">
          <p className="text-sm text-muted-foreground">
            {estimate === null ? "Price after saving" : (
              <>
                <span className="num font-semibold text-foreground">{formatMoney(estimate)}</span> est.
              </>
            )}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button disabled={problems.length > 0} onClick={() => onSave(line)}>
              {initial ? "Update line" : "Add to order"}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
