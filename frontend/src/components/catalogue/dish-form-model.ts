import type { Dish, DishWriteInput } from "@/lib/api";
import { isApiError, describeError } from "@/lib/api-client";
import { centsToInput, parseMoneyToCents } from "@/lib/decimal-input";

export type GroupOptionDraft = { optionId: string; name: string };
export type GroupPortionDraft = { portionSizeId: string; extra: string };
export type GroupDraft = {
  key: string; id?: string; name: string; isRequired: boolean; usesPortions: boolean;
  options: GroupOptionDraft[]; portions: GroupPortionDraft[];
};
export type DishDraft = {
  name: string; description: string; imageUrl: string; sku: string; temperature: "HOT" | "COLD";
  cost: string; stationId: string | null; minQty: string;
  allergenIds: string[]; dietaryTagIds: string[]; groups: GroupDraft[];
};
export type DishField = "name" | "description" | "imageUrl" | "sku" | "cost" | "minQty";

let n = 0;
export const groupKey = () => `g${++n}`;

export const emptyDish = (): DishDraft => ({
  name: "", description: "", imageUrl: "", sku: "", temperature: "HOT", cost: "", stationId: null, minQty: "",
  allergenIds: [], dietaryTagIds: [], groups: [],
});

export function draftFromDish(dish: Dish): DishDraft {
  return {
    name: dish.name,
    description: dish.description,
    imageUrl: dish.imageUrl,
    sku: dish.sku,
    temperature: dish.temperature,
    cost: centsToInput(dish.costCents),
    stationId: dish.station?.id ?? null,
    minQty: dish.minimumOrderQuantity ? String(dish.minimumOrderQuantity) : "",
    allergenIds: dish.allergens.map((a) => a.allergen.id),
    dietaryTagIds: dish.dietaryTags.map((t) => t.dietaryTag.id),
    groups: [...dish.optionGroups]
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .map((g) => ({
        key: groupKey(),
        id: g.id,
        name: g.name,
        isRequired: g.isRequired,
        usesPortions: g.usesPortions,
        options: [...g.options].sort((a, b) => a.displayOrder - b.displayOrder).map((o) => ({ optionId: o.optionId, name: o.option.name })),
        portions: [...g.portions].sort((a, b) => a.displayOrder - b.displayOrder).map((p) => ({ portionSizeId: p.portionSizeId, extra: centsToInput(p.extraChargeCents) })),
      })),
  };
}

export type DraftProblems = { fields: Partial<Record<DishField, string>>; groups: Record<number, string[]>; form: string[] };
const none = (): DraftProblems => ({ fields: {}, groups: {}, form: [] });

/** Builds the API body (integer cents); returns problems instead when inputs are not valid yet. */
export function toDishInput(draft: DishDraft): { input: DishWriteInput } | { problems: DraftProblems } {
  const problems = none();
  const cost = parseMoneyToCents(draft.cost);
  if (!draft.name.trim()) problems.fields.name = "Enter a name.";
  if (!draft.sku.trim()) problems.fields.sku = "Enter an SKU.";
  if (!/^https?:\/\//.test(draft.imageUrl.trim())) problems.fields.imageUrl = "Enter an image URL starting with http:// or https://.";
  if (cost === null || Number.isNaN(cost)) problems.fields.cost = "Enter a cost like 105.50.";
  const minQty = draft.minQty.trim() ? Number(draft.minQty) : null;
  if (minQty !== null && (!Number.isInteger(minQty) || minQty < 1)) problems.fields.minQty = "Use a whole number of 1 or more, or leave it empty.";
  draft.groups.forEach((g, i) => {
    const list: string[] = [];
    if (!g.name.trim()) list.push("Give the group a name.");
    if (g.options.length === 0) list.push("Add at least one option.");
    if (g.usesPortions && g.portions.length === 0) list.push("Choose the portion sizes this group sells.");
    if (g.portions.some((p) => Number.isNaN(parseMoneyToCents(p.extra) ?? 0))) list.push("Portion charges must look like 10.00.");
    if (list.length) problems.groups[i] = list;
  });
  if (Object.keys(problems.fields).length || Object.keys(problems.groups).length) return { problems };
  return {
    input: {
      name: draft.name.trim(),
      description: draft.description.trim(),
      imageUrl: draft.imageUrl.trim(),
      sku: draft.sku.trim(),
      temperature: draft.temperature,
      costCents: cost as number,
      minimumOrderQuantity: minQty,
      stationId: draft.stationId,
      allergenIds: draft.allergenIds,
      dietaryTagIds: draft.dietaryTagIds,
      optionGroups: draft.groups.map((g, i) => ({
        ...(g.id && { id: g.id }),
        name: g.name.trim(),
        isRequired: g.isRequired,
        usesPortions: g.usesPortions,
        displayOrder: i,
        options: g.options.map((o, j) => ({ optionId: o.optionId, displayOrder: j })),
        portions: g.usesPortions ? g.portions.map((p, j) => ({ portionSizeId: p.portionSizeId, extraChargeCents: parseMoneyToCents(p.extra) ?? 0, displayOrder: j })) : [],
      })),
    },
  };
}

const FIELD_PREFIX: [string, DishField][] = [
  ["minimumOrderQuantity", "minQty"], ["costCents", "cost"], ["imageUrl", "imageUrl"], ["description", "description"], ["name", "name"], ["sku", "sku"],
];

/** Server messages -> field, option group (by "optionGroups.N" path or quoted group name), or form. */
export function mapDishErrors(error: unknown, draft: DishDraft): DraftProblems {
  const problems = none();
  const messages = isApiError(error) ? error.messages : [describeError(error)];
  for (const message of messages) {
    const path = /^optionGroups\.(\d+)/.exec(message);
    const byName = draft.groups.findIndex((g) => g.name && message.includes(`'${g.name}'`));
    const groupIndex = path ? Number(path[1]) : byName;
    const field = FIELD_PREFIX.find(([prefix]) => message.startsWith(`${prefix} `));
    if (groupIndex >= 0) (problems.groups[groupIndex] ??= []).push(message);
    else if (field) problems.fields[field[1]] = message;
    else problems.form.push(message);
  }
  return problems;
}
