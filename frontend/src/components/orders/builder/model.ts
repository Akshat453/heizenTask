import type { MenuPreview, MenuPreviewDish, OrderDetail, OrderLineInput } from "@/lib/api";

/** One option choice inside a combination row. */
export type Selection = { optionId: string; portionSizeId?: string };
export type ComboDraft = { key: string; quantity: number; selections: Record<string, Selection | undefined> };
export type LineDraft = { key: string; dishId: string; dishName: string; quantity: number; combinations: ComboDraft[] };
/** undefined = keep the default (create) or the current value (edit). */
export type DeliveryDraft = { addressId?: string; time?: string; packagingId?: string };

let counter = 0;
export const newKey = () => `k${++counter}`;

export function emptyCombo(quantity: number): ComboDraft {
  return { key: newKey(), quantity, selections: {} };
}

export function dishIndex(menu: MenuPreview | undefined): Map<string, MenuPreviewDish> {
  const map = new Map<string, MenuPreviewDish>();
  for (const category of menu?.categories ?? []) for (const dish of category.dishes) if (!map.has(dish.id)) map.set(dish.id, dish);
  return map;
}

/**
 * "est." unit price of one combination from the menu-preview prices:
 * dish + chosen options + portion charges, in integer cents. null if any price is unknown.
 * The server computes the real price when the order is saved.
 */
export function estimateUnitCents(dish: MenuPreviewDish | undefined, combo: ComboDraft): number | null {
  if (!dish) return null;
  let cents = dish.resolvedPriceCents;
  for (const group of dish.optionGroups) {
    const selection = combo.selections[group.id];
    if (!selection) continue;
    const option = group.options.find((o) => o.id === selection.optionId);
    if (!option) return null;
    cents += option.resolvedPriceCents;
    if (selection.portionSizeId) {
      const portion = group.portions.find((p) => p.id === selection.portionSizeId);
      if (!portion) return null;
      cents += portion.extraChargeCents;
    }
  }
  return cents;
}

export function estimateLineCents(dish: MenuPreviewDish | undefined, line: LineDraft): number | null {
  let total = 0;
  for (const combo of line.combinations) {
    const unit = estimateUnitCents(dish, combo);
    if (unit === null) return null;
    total += unit * combo.quantity;
  }
  return total;
}

/** Client-side readiness checks so Save is only offered for a complete row set; the server re-validates. */
export function lineProblems(dish: MenuPreviewDish, line: LineDraft): string[] {
  const problems: string[] = [];
  const allocated = line.combinations.reduce((sum, c) => sum + c.quantity, 0);
  if (line.quantity < 1) problems.push("Quantity must be at least 1.");
  if (dish.minimumOrderQuantity && line.quantity < dish.minimumOrderQuantity)
    problems.push(`Minimum ${dish.minimumOrderQuantity} for this dish.`);
  if (allocated !== line.quantity) problems.push(`${allocated} of ${line.quantity} allocated.`);
  line.combinations.forEach((combo, index) => {
    if (combo.quantity < 1) problems.push(`Combination ${index + 1} needs a quantity.`);
    for (const group of dish.optionGroups) {
      const selection = combo.selections[group.id];
      if (group.isRequired && !selection) problems.push(`Combination ${index + 1}: choose ${group.name}.`);
      if (selection && group.usesPortions && !selection.portionSizeId)
        problems.push(`Combination ${index + 1}: choose a ${group.name} portion.`);
    }
  });
  const signatures = line.combinations.map((combo) =>
    JSON.stringify(Object.entries(combo.selections).filter(([, s]) => s).sort(([a], [b]) => a.localeCompare(b))),
  );
  if (new Set(signatures).size !== signatures.length) problems.push("Two combinations are identical; merge their quantities.");
  return problems;
}

export function toLineInputs(lines: LineDraft[]): OrderLineInput[] {
  return lines.map((line) => ({
    dishId: line.dishId,
    quantity: line.quantity,
    combinations: line.combinations.map((combo) => ({
      quantity: combo.quantity,
      options: Object.entries(combo.selections).flatMap(([optionGroupId, s]) =>
        s ? [{ optionGroupId, optionId: s.optionId, ...(s.portionSizeId && { portionSizeId: s.portionSizeId }) }] : [],
      ),
    })),
  }));
}

export function linesFromOrder(order: OrderDetail): LineDraft[] {
  return order.lines.map((line) => ({
    key: newKey(),
    dishId: line.dishId,
    dishName: line.dishNameSnapshot,
    quantity: line.quantity,
    combinations: line.combinations.map((combo) => ({
      key: newKey(),
      quantity: combo.quantity,
      selections: Object.fromEntries(
        combo.options.map((o) => [o.optionGroupId, { optionId: o.optionId, ...(o.portionSizeId && { portionSizeId: o.portionSizeId }) }]),
      ),
    })),
  }));
}
