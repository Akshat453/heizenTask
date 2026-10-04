import type { Prisma } from '../generated/prisma/client.js';
import type {
  BatchPriceResolution,
  PriceResolution,
} from '../pricing/price-resolver.service.js';

/**
 * The single authoritative orderability policy shared by Employee Menu Preview
 * and Order create/edit/place. Pure: callers load the raw menu graph and prices,
 * this decides what is visible and orderable.
 */

export const orderableDishInclude = {
  allergens: { include: { allergen: true } },
  dietaryTags: { include: { dietaryTag: true } },
  optionGroups: {
    orderBy: { displayOrder: 'asc' },
    include: {
      options: {
        orderBy: { displayOrder: 'asc' },
        include: {
          option: {
            include: {
              allergens: { include: { allergen: true } },
              dietaryTags: { include: { dietaryTag: true } },
            },
          },
        },
      },
      portions: {
        orderBy: { displayOrder: 'asc' },
        include: { portionSize: true },
      },
    },
  },
} as const satisfies Prisma.DishInclude;

export type RawMenuDish = Prisma.DishGetPayload<{
  include: typeof orderableDishInclude;
}>;
export type RawMenuCategory = Prisma.MenuCategoryGetPayload<{
  include: {
    items: { include: { dish: { include: typeof orderableDishInclude } } };
  };
}>;
type RawOption =
  RawMenuDish['optionGroups'][number]['options'][number]['option'];
type RawPortionSize =
  RawMenuDish['optionGroups'][number]['portions'][number]['portionSize'];
type NamedRef = { id: string; name: string };

/**
 * PREVIEW: normal Employee menu (secret categories excluded, empty categories removed).
 * CATEGORY: direct slug access (secret allowed; empty category kept).
 * ORDER: Order validation (secret allowed — it is reachable by direct link).
 * No scope bypasses inactivity, Company hiding, pricing, or required-group usability.
 */
export type OrderabilityScope = 'PREVIEW' | 'CATEGORY' | 'ORDER';

export type OrderablePortion = {
  portionSizeId: string;
  name: string;
  extraChargeCents: number;
  displayOrder: number;
  portionSize: RawPortionSize;
};
export type OrderableOption = {
  optionId: string;
  name: string;
  displayOrder: number;
  priceCents: number;
  priceSource: PriceResolution['source'];
  option: RawOption;
};
export type OrderableGroup = {
  id: string;
  name: string;
  isRequired: boolean;
  usesPortions: boolean;
  displayOrder: number;
  options: OrderableOption[];
  portions: OrderablePortion[];
};
export type OrderableDish = {
  id: string;
  name: string;
  sku: string;
  minimumOrderQuantity: number | null;
  priceCents: number;
  priceSource: PriceResolution['source'];
  groups: OrderableGroup[];
  preferenceContext: {
    allergenWarnings: NamedRef[];
    matchingDietaryTags: NamedRef[];
  };
  dish: RawMenuDish;
};
export type OrderableCategory = {
  category: RawMenuCategory;
  dishes: Array<{ displayOrder: number; dish: OrderableDish }>;
};

export type OrderabilityInput = {
  scope: OrderabilityScope;
  categories: RawMenuCategory[];
  hiddenCategoryIds: ReadonlySet<string>;
  hiddenDishIds: ReadonlySet<string>;
  prices: BatchPriceResolution;
  preferences: {
    allergenIds: ReadonlySet<string>;
    dietaryTagIds: ReadonlySet<string>;
  };
};

export type OrderabilityResult = {
  categories: OrderableCategory[];
  dishesById: Map<string, OrderableDish>;
  /** Active, visible dishes left out only because they have no price on the tier. */
  unpricedDishIds: Set<string>;
};

/** Dish/Option ids whose prices are needed (only active candidates). */
export function priceCandidates(categories: RawMenuCategory[]): {
  dishIds: string[];
  optionIds: string[];
} {
  const dishIds = new Set<string>();
  const optionIds = new Set<string>();
  for (const category of categories) {
    for (const item of category.items) {
      if (!item.isActive || !item.dish.isActive) continue;
      dishIds.add(item.dish.id);
      for (const group of item.dish.optionGroups)
        for (const { option } of group.options)
          if (option.isActive) optionIds.add(option.id);
    }
  }
  return { dishIds: [...dishIds], optionIds: [...optionIds] };
}

function evaluateDish(
  dish: RawMenuDish,
  input: OrderabilityInput,
): OrderableDish | null {
  const price = input.prices.dishes.get(dish.id);
  if (!price || price.priceCents === null) return null;

  const groups: OrderableGroup[] = [];
  for (const group of dish.optionGroups) {
    const options: OrderableOption[] = [];
    for (const relation of group.options) {
      if (!relation.option.isActive) continue;
      const optionPrice = input.prices.options.get(relation.option.id);
      // A missing Option price means unavailable, never free.
      if (!optionPrice || optionPrice.priceCents === null) continue;
      options.push({
        optionId: relation.option.id,
        name: relation.option.name,
        displayOrder: relation.displayOrder,
        priceCents: optionPrice.priceCents,
        priceSource: optionPrice.source,
        option: relation.option,
      });
    }
    const portions: OrderablePortion[] = group.usesPortions
      ? group.portions
          .filter(({ portionSize }) => portionSize.isActive)
          .map((portion) => ({
            portionSizeId: portion.portionSizeId,
            name: portion.portionSize.name,
            extraChargeCents: portion.extraChargeCents,
            displayOrder: portion.displayOrder,
            portionSize: portion.portionSize,
          }))
      : [];
    const usable =
      options.length > 0 && (!group.usesPortions || portions.length > 0);
    if (group.isRequired && !usable) return null; // required group cannot be satisfied → Dish not orderable
    groups.push({
      id: group.id,
      name: group.name,
      isRequired: group.isRequired,
      usesPortions: group.usesPortions,
      displayOrder: group.displayOrder,
      options: usable ? options : [],
      portions: usable ? portions : [],
    });
  }

  return {
    id: dish.id,
    name: dish.name,
    sku: dish.sku,
    minimumOrderQuantity: dish.minimumOrderQuantity,
    priceCents: price.priceCents,
    priceSource: price.source,
    groups,
    preferenceContext: {
      allergenWarnings: dish.allergens
        .map(({ allergen }) => allergen)
        .filter(({ id }) => input.preferences.allergenIds.has(id)),
      matchingDietaryTags: dish.dietaryTags
        .map(({ dietaryTag }) => dietaryTag)
        .filter(({ id }) => input.preferences.dietaryTagIds.has(id)),
    },
    dish,
  };
}

export function buildOrderableMenu(
  input: OrderabilityInput,
): OrderabilityResult {
  const dishesById = new Map<string, OrderableDish>();
  const unpricedDishIds = new Set<string>();
  const categories: OrderableCategory[] = [];

  for (const category of input.categories) {
    if (!category.isActive || input.hiddenCategoryIds.has(category.id))
      continue;
    if (input.scope === 'PREVIEW' && category.isSecret) continue;

    const dishes: OrderableCategory['dishes'] = [];
    for (const item of category.items) {
      if (
        !item.isActive ||
        !item.dish.isActive ||
        input.hiddenDishIds.has(item.dish.id)
      )
        continue;
      const orderable =
        dishesById.get(item.dish.id) ?? evaluateDish(item.dish, input);
      if (!orderable) {
        if (
          (input.prices.dishes.get(item.dish.id)?.priceCents ?? null) === null
        )
          unpricedDishIds.add(item.dish.id);
        continue;
      }
      dishesById.set(orderable.id, orderable);
      dishes.push({ displayOrder: item.displayOrder, dish: orderable });
    }
    if (dishes.length === 0 && input.scope === 'PREVIEW') continue;
    categories.push({ category, dishes });
  }

  return { categories, dishesById, unpricedDishIds };
}
