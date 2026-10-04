import { BadRequestException, ConflictException } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client.js';
import type {
  OrderableDish,
  OrderableGroup,
  OrderableOption,
  OrderablePortion,
} from '../../menu/orderability.policy.js';
import type { OrderLineDto } from '../dto/order.dto.js';

/**
 * Pure Order graph validation and snapshot assembly against the authoritative
 * orderable menu. No I/O: the orchestration service supplies the menu that the
 * shared orderability policy produced inside its transaction.
 */

export type ValidatedSelection = {
  group: OrderableGroup;
  option: OrderableOption;
  portion: OrderablePortion | null;
};
export type ValidatedCombination = {
  quantity: number;
  selections: ValidatedSelection[];
};
export type ValidatedLine = {
  dish: OrderableDish;
  quantity: number;
  combinations: ValidatedCombination[];
};

export function validateOrderLines(
  lines: readonly OrderLineDto[],
  dishesById: ReadonlyMap<string, OrderableDish>,
): ValidatedLine[] {
  if (lines.length === 0)
    throw new BadRequestException('Order must contain at least one line.');
  const seenDishes = new Set<string>();

  return lines.map((line) => {
    if (seenDishes.has(line.dishId))
      throw new BadRequestException(
        `Dish ${line.dishId} appears in more than one line; use combinations instead.`,
      );
    seenDishes.add(line.dishId);

    const dish = dishesById.get(line.dishId);
    if (!dish)
      throw new ConflictException(
        `Dish ${line.dishId} is not orderable for this employee.`,
      );
    if (line.combinations.length === 0)
      throw new BadRequestException(`Dish '${dish.name}' has no combinations.`);

    const combinationSum = line.combinations.reduce(
      (sum, combination) => sum + combination.quantity,
      0,
    );
    if (combinationSum !== line.quantity) {
      throw new BadRequestException(
        `Dish '${dish.name}': combination quantities total ${combinationSum} but line quantity is ${line.quantity}.`,
      );
    }
    if (
      dish.minimumOrderQuantity !== null &&
      line.quantity < dish.minimumOrderQuantity
    ) {
      throw new ConflictException(
        `Dish '${dish.name}' has a minimum order quantity of ${dish.minimumOrderQuantity}.`,
      );
    }

    const groupsById = new Map(dish.groups.map((group) => [group.id, group]));
    const seenCombinations = new Set<string>();

    const combinations = line.combinations.map((combination) => {
      if (
        !Number.isSafeInteger(combination.quantity) ||
        combination.quantity < 1
      )
        throw new BadRequestException(
          'Combination quantity must be at least 1.',
        );
      const byGroup = new Map<string, (typeof combination.options)[number]>();
      for (const selection of combination.options) {
        if (!groupsById.has(selection.optionGroupId))
          throw new BadRequestException(
            `Option group ${selection.optionGroupId} does not belong to dish '${dish.name}'.`,
          );
        if (byGroup.has(selection.optionGroupId)) {
          throw new BadRequestException(
            `Multiple options selected for group '${groupsById.get(selection.optionGroupId)!.name}' (choose at most one).`,
          );
        }
        byGroup.set(selection.optionGroupId, selection);
      }

      const selections: ValidatedSelection[] = [];
      for (const group of dish.groups) {
        const selection = byGroup.get(group.id);
        if (!selection) {
          if (group.isRequired)
            throw new BadRequestException(
              `Option group '${group.name}' is required for dish '${dish.name}'.`,
            );
          continue;
        }
        const option = group.options.find(
          ({ optionId }) => optionId === selection.optionId,
        );
        if (!option)
          throw new ConflictException(
            `Option ${selection.optionId} is not available for group '${group.name}'.`,
          );

        let portion: OrderablePortion | null = null;
        if (group.usesPortions) {
          if (!selection.portionSizeId)
            throw new BadRequestException(
              `Portion size is required for option group '${group.name}'.`,
            );
          portion =
            group.portions.find(
              ({ portionSizeId }) => portionSizeId === selection.portionSizeId,
            ) ?? null;
          if (!portion)
            throw new ConflictException(
              `Portion size ${selection.portionSizeId} is not available for group '${group.name}'.`,
            );
        } else if (selection.portionSizeId) {
          throw new BadRequestException(
            `Portion size is not allowed for option group '${group.name}'.`,
          );
        }
        selections.push({ group, option, portion });
      }

      const signature = selections
        .map(
          ({ group, option, portion }) =>
            `${group.id}:${option.optionId}:${portion?.portionSizeId ?? ''}`,
        )
        .join('|');
      if (seenCombinations.has(signature))
        throw new BadRequestException(
          `Dish '${dish.name}' repeats an identical combination; merge their quantities.`,
        );
      seenCombinations.add(signature);

      return { quantity: combination.quantity, selections };
    });

    return { dish, quantity: line.quantity, combinations };
  });
}

function safeCents(value: number, label: string): number {
  if (!Number.isSafeInteger(value) || value < 0)
    throw new BadRequestException(
      `${label} is outside the supported money range.`,
    );
  return value;
}

export type BuiltOrderGraph = {
  lines: Prisma.OrderLineUncheckedCreateWithoutOrderInput[];
  totalCents: number;
};

/**
 * Snapshot graph in integer cents:
 *   combination unit = dish price + Σ(option price + portion surcharge)
 *   combination total = unit × quantity; line total = Σ combination totals.
 */
export function buildOrderGraph(
  lines: readonly ValidatedLine[],
): BuiltOrderGraph {
  let totalCents = 0;
  const built = lines.map(({ dish, quantity, combinations }) => {
    let lineTotalCents = 0;
    const combinationData = combinations.map(
      ({ quantity: combinationQuantity, selections }) => {
        const unitPriceCents = safeCents(
          selections.reduce(
            (sum, { option, portion }) =>
              sum + option.priceCents + (portion?.extraChargeCents ?? 0),
            dish.priceCents,
          ),
          'Combination unit price',
        );
        const combinationTotal = safeCents(
          unitPriceCents * combinationQuantity,
          'Combination total',
        );
        lineTotalCents = safeCents(
          lineTotalCents + combinationTotal,
          'Line total',
        );
        const options: Prisma.OrderCombinationOptionUncheckedCreateWithoutCombinationInput[] =
          selections.map(({ group, option, portion }) => ({
            optionGroupId: group.id,
            optionId: option.optionId,
            portionSizeId: portion?.portionSizeId ?? null,
            optionGroupNameSnapshot: group.name,
            optionNameSnapshot: option.name,
            portionNameSnapshot: portion?.name ?? null,
            optionPriceCents: option.priceCents,
            portionExtraCents: portion?.extraChargeCents ?? 0,
          }));
        const combination: Prisma.OrderCombinationUncheckedCreateWithoutOrderLineInput =
          {
            quantity: combinationQuantity,
            unitPriceCents,
            totalCents: combinationTotal,
            options: { create: options },
          };
        return combination;
      },
    );
    totalCents = safeCents(totalCents + lineTotalCents, 'Order total');
    const line: Prisma.OrderLineUncheckedCreateWithoutOrderInput = {
      dishId: dish.id,
      dishNameSnapshot: dish.name,
      dishSkuSnapshot: dish.sku,
      quantity,
      dishUnitPriceCents: dish.priceCents,
      lineTotalCents,
      combinations: { create: combinationData },
    };
    return line;
  });
  return { lines: built, totalCents };
}
