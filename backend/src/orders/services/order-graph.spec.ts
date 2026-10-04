import { BadRequestException, ConflictException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import {
  prices,
  rawCategory,
  rawDish,
} from '../../../test/support/menu-factory.js';
import { buildOrderableMenu } from '../../menu/orderability.policy.js';
import type { OrderLineDto } from '../dto/order.dto.js';
import { buildOrderGraph, validateOrderLines } from './order-graph.js';

const menu = buildOrderableMenu({
  scope: 'ORDER',
  categories: [
    rawCategory('mains', [
      rawDish({
        id: 'bowl',
        minimumOrderQuantity: 2,
        groups: [
          {
            id: 'protein',
            isRequired: true,
            options: [
              { id: 'paneer' },
              { id: 'tofu' },
              { id: 'retired', isActive: false },
            ],
          },
          {
            id: 'rice',
            usesPortions: true,
            options: [{ id: 'brown' }],
            portions: [
              { id: 'small', extraChargeCents: 0 },
              { id: 'large', extraChargeCents: 40 },
              { id: 'xl', isActive: false },
            ],
          },
          { id: 'sauce', options: [{ id: 'mint' }] },
        ],
      }),
      rawDish({ id: 'brownie' }),
    ]),
  ],
  hiddenCategoryIds: new Set(),
  hiddenDishIds: new Set(),
  prices: prices(
    { bowl: 300, brownie: 120 },
    { paneer: 80, tofu: 60, retired: 10, brown: 25, mint: 15 },
  ),
  preferences: { allergenIds: new Set(), dietaryTagIds: new Set() },
}).dishesById;

const line = (overrides: Partial<OrderLineDto> = {}): OrderLineDto => ({
  dishId: 'bowl',
  quantity: 3,
  combinations: [
    {
      quantity: 2,
      options: [
        { optionGroupId: 'protein', optionId: 'paneer' },
        { optionGroupId: 'rice', optionId: 'brown', portionSizeId: 'large' },
      ],
    },
    {
      quantity: 1,
      options: [
        { optionGroupId: 'protein', optionId: 'tofu' },
        { optionGroupId: 'sauce', optionId: 'mint' },
      ],
    },
  ],
  ...overrides,
});

describe('validateOrderLines', () => {
  it('accepts a valid graph', () => {
    expect(
      validateOrderLines(
        [
          line(),
          {
            dishId: 'brownie',
            quantity: 1,
            combinations: [{ quantity: 1, options: [] }],
          },
        ],
        menu,
      ),
    ).toHaveLength(2);
  });

  it('requires SUM(combination.quantity) == line.quantity', () => {
    expect(() => validateOrderLines([line({ quantity: 4 })], menu)).toThrow(
      /total 3 but line quantity is 4/,
    );
  });

  it('enforces the dish minimum quantity', () => {
    const single = line({
      quantity: 1,
      combinations: [
        {
          quantity: 1,
          options: [{ optionGroupId: 'protein', optionId: 'paneer' }],
        },
      ],
    });
    expect(() => validateOrderLines([single], menu)).toThrow(ConflictException);
  });

  it('requires exactly one selection for a required group and at most one for optional groups', () => {
    const missingRequired = line({
      quantity: 2,
      combinations: [
        {
          quantity: 2,
          options: [{ optionGroupId: 'sauce', optionId: 'mint' }],
        },
      ],
    });
    expect(() => validateOrderLines([missingRequired], menu)).toThrow(
      /required/,
    );
    const twoInGroup = line({
      quantity: 2,
      combinations: [
        {
          quantity: 2,
          options: [
            { optionGroupId: 'protein', optionId: 'paneer' },
            { optionGroupId: 'protein', optionId: 'tofu' },
          ],
        },
      ],
    });
    expect(() => validateOrderLines([twoInGroup], menu)).toThrow(
      /Multiple options/,
    );
  });

  it('rejects inactive Options and Portions, and invalid portion mappings', () => {
    const combo = (options: OrderLineDto['combinations'][number]['options']) =>
      line({ quantity: 2, combinations: [{ quantity: 2, options }] });
    expect(() =>
      validateOrderLines(
        [combo([{ optionGroupId: 'protein', optionId: 'retired' }])],
        menu,
      ),
    ).toThrow(ConflictException);
    const withRice = (portionSizeId?: string) =>
      combo([
        { optionGroupId: 'protein', optionId: 'paneer' },
        { optionGroupId: 'rice', optionId: 'brown', portionSizeId },
      ]);
    expect(() => validateOrderLines([withRice('xl')], menu)).toThrow(
      ConflictException,
    );
    expect(() => validateOrderLines([withRice(undefined)], menu)).toThrow(
      /Portion size is required/,
    );
    expect(() =>
      validateOrderLines(
        [
          combo([
            {
              optionGroupId: 'protein',
              optionId: 'paneer',
              portionSizeId: 'small',
            },
          ]),
        ],
        menu,
      ),
    ).toThrow(/not allowed/);
    expect(() =>
      validateOrderLines(
        [
          combo([
            { optionGroupId: 'protein', optionId: 'paneer' },
            { optionGroupId: 'unknown', optionId: 'x' },
          ]),
        ],
        menu,
      ),
    ).toThrow(BadRequestException);
  });

  it('rejects unorderable dishes, duplicate dish lines and duplicate identical combinations', () => {
    expect(() =>
      validateOrderLines([line({ dishId: 'not-on-menu' })], menu),
    ).toThrow(/not orderable/);
    expect(() => validateOrderLines([line(), line()], menu)).toThrow(
      /more than one line/,
    );
    const same = {
      quantity: 1,
      options: [{ optionGroupId: 'protein', optionId: 'paneer' }],
    };
    expect(() =>
      validateOrderLines(
        [line({ quantity: 2, combinations: [same, same] })],
        menu,
      ),
    ).toThrow(/identical combination/);
    expect(() => validateOrderLines([], menu)).toThrow(/at least one line/);
  });
});

describe('buildOrderGraph', () => {
  it('prices combinations in integer cents and snapshots names/prices', () => {
    const graph = buildOrderGraph(validateOrderLines([line()], menu));
    // unit A = 300 + 80 (paneer) + 25 (brown) + 40 (large) = 445 ×2 = 890
    // unit B = 300 + 60 (tofu) + 15 (mint) = 375 ×1 = 375
    expect(graph.totalCents).toBe(1265);
    const [built] = graph.lines;
    expect(built).toMatchObject({
      dishId: 'bowl',
      dishNameSnapshot: 'bowl',
      dishSkuSnapshot: 'SKU-bowl',
      quantity: 3,
      dishUnitPriceCents: 300,
      lineTotalCents: 1265,
    });
    const combinations = (
      built!.combinations as { create: Array<Record<string, unknown>> }
    ).create;
    expect(
      combinations.map(({ quantity, unitPriceCents, totalCents }) => ({
        quantity,
        unitPriceCents,
        totalCents,
      })),
    ).toEqual([
      { quantity: 2, unitPriceCents: 445, totalCents: 890 },
      { quantity: 1, unitPriceCents: 375, totalCents: 375 },
    ]);
    expect((combinations[0]!.options as { create: unknown[] }).create).toEqual([
      {
        optionGroupId: 'protein',
        optionId: 'paneer',
        portionSizeId: null,
        optionGroupNameSnapshot: 'protein',
        optionNameSnapshot: 'paneer',
        portionNameSnapshot: null,
        optionPriceCents: 80,
        portionExtraCents: 0,
      },
      {
        optionGroupId: 'rice',
        optionId: 'brown',
        portionSizeId: 'large',
        optionGroupNameSnapshot: 'rice',
        optionNameSnapshot: 'brown',
        portionNameSnapshot: 'large',
        optionPriceCents: 25,
        portionExtraCents: 40,
      },
    ]);
  });
});
