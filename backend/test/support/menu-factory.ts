import type {
  RawMenuCategory,
  RawMenuDish,
} from '../../src/menu/orderability.policy.js';
import type {
  BatchPriceResolution,
  PriceResolution,
} from '../../src/pricing/price-resolver.service.js';

/** In-memory raw menu graph builders for pure orderability / order-graph unit tests. */

type OptionSpec = {
  id: string;
  name?: string;
  isActive?: boolean;
  allergenIds?: string[];
};
type PortionSpec = {
  id: string;
  name?: string;
  isActive?: boolean;
  extraChargeCents?: number;
};
type GroupSpec = {
  id: string;
  name?: string;
  isRequired?: boolean;
  usesPortions?: boolean;
  options: OptionSpec[];
  portions?: PortionSpec[];
};
type DishSpec = {
  id: string;
  name?: string;
  isActive?: boolean;
  minimumOrderQuantity?: number | null;
  allergenIds?: string[];
  groups?: GroupSpec[];
};

const now = new Date('2026-01-01T00:00:00.000Z');
const ref = (id: string) => ({ id, name: id, isActive: true });

export function rawDish(spec: DishSpec): RawMenuDish {
  return {
    id: spec.id,
    name: spec.name ?? spec.id,
    description: '',
    imageUrl: '',
    sku: `SKU-${spec.id}`,
    temperature: 'HOT',
    costCents: 100,
    minimumOrderQuantity: spec.minimumOrderQuantity ?? null,
    stationId: null,
    isActive: spec.isActive ?? true,
    createdAt: now,
    updatedAt: now,
    allergens: (spec.allergenIds ?? []).map((id) => ({
      dishId: spec.id,
      allergenId: id,
      allergen: ref(id),
    })),
    dietaryTags: [],
    optionGroups: (spec.groups ?? []).map((group, index) => ({
      id: group.id,
      dishId: spec.id,
      name: group.name ?? group.id,
      isRequired: group.isRequired ?? false,
      usesPortions: group.usesPortions ?? false,
      displayOrder: index,
      options: group.options.map((option, optionIndex) => ({
        optionGroupId: group.id,
        optionId: option.id,
        displayOrder: optionIndex,
        option: {
          id: option.id,
          name: option.name ?? option.id,
          costCents: 10,
          isActive: option.isActive ?? true,
          createdAt: now,
          updatedAt: now,
          allergens: (option.allergenIds ?? []).map((id) => ({
            optionId: option.id,
            allergenId: id,
            allergen: ref(id),
          })),
          dietaryTags: [],
        },
      })),
      portions: (group.portions ?? []).map((portion, portionIndex) => ({
        optionGroupId: group.id,
        portionSizeId: portion.id,
        extraChargeCents: portion.extraChargeCents ?? 0,
        displayOrder: portionIndex,
        portionSize: {
          id: portion.id,
          name: portion.name ?? portion.id,
          displayOrder: portionIndex,
          isActive: portion.isActive ?? true,
        },
      })),
    })),
  };
}

export function rawCategory(
  id: string,
  dishes: Array<RawMenuDish | { dish: RawMenuDish; isActive?: boolean }>,
  flags: { isActive?: boolean; isSecret?: boolean } = {},
): RawMenuCategory {
  return {
    id,
    name: id,
    slug: id,
    displayOrder: 0,
    isActive: flags.isActive ?? true,
    isSecret: flags.isSecret ?? false,
    items: dishes.map((entry, index) => {
      const { dish, isActive } =
        'dish' in entry ? entry : { dish: entry, isActive: true };
      return {
        categoryId: id,
        dishId: dish.id,
        displayOrder: index,
        isActive: isActive ?? true,
        dish,
      };
    }),
  };
}

export function prices(
  dishes: Record<string, number | null>,
  options: Record<string, number | null> = {},
): BatchPriceResolution {
  const resolution = (value: number | null): PriceResolution =>
    value === null
      ? { priceCents: null, source: 'MISSING' }
      : { priceCents: value, source: 'OVERRIDE' };
  return {
    dishes: new Map(
      Object.entries(dishes).map(([id, value]) => [id, resolution(value)]),
    ),
    options: new Map(
      Object.entries(options).map(([id, value]) => [id, resolution(value)]),
    ),
  };
}
