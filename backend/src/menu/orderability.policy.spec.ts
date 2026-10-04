import { describe, expect, it } from 'vitest';
import {
  prices,
  rawCategory,
  rawDish,
} from '../../test/support/menu-factory.js';
import {
  buildOrderableMenu,
  type OrderabilityInput,
  type OrderabilityScope,
  priceCandidates,
} from './orderability.policy.js';

const noPreferences = {
  allergenIds: new Set<string>(),
  dietaryTagIds: new Set<string>(),
};

function evaluate(
  scope: OrderabilityScope,
  input: Partial<OrderabilityInput> &
    Pick<OrderabilityInput, 'categories' | 'prices'>,
) {
  return buildOrderableMenu({
    scope,
    hiddenCategoryIds: new Set(),
    hiddenDishIds: new Set(),
    preferences: noPreferences,
    ...input,
  });
}
const dishIds = (result: ReturnType<typeof evaluate>) =>
  [...result.dishesById.keys()].sort();

describe('orderability policy', () => {
  const bowl = rawDish({ id: 'bowl' });
  const wrap = rawDish({ id: 'wrap' });

  it('excludes Company-hidden categories and dishes in every scope', () => {
    const categories = [
      rawCategory('mains', [bowl, wrap]),
      rawCategory('snacks', [rawDish({ id: 'chips' })]),
    ];
    for (const scope of ['PREVIEW', 'ORDER'] as const) {
      const result = evaluate(scope, {
        categories,
        prices: prices({ bowl: 100, wrap: 100, chips: 50 }),
        hiddenCategoryIds: new Set(['snacks']),
        hiddenDishIds: new Set(['wrap']),
      });
      expect(dishIds(result)).toEqual(['bowl']);
    }
  });

  it('excludes secret categories from preview but allows them for direct access and orders', () => {
    const categories = [rawCategory('secret', [bowl], { isSecret: true })];
    const input = { categories, prices: prices({ bowl: 100 }) };
    expect(evaluate('PREVIEW', input).categories).toEqual([]);
    expect(dishIds(evaluate('CATEGORY', input))).toEqual(['bowl']);
    expect(dishIds(evaluate('ORDER', input))).toEqual(['bowl']);
  });

  it('secret access never bypasses inactivity, hiding or pricing', () => {
    const categories = [
      rawCategory(
        'secret',
        [
          bowl,
          rawDish({ id: 'off', isActive: false }),
          rawDish({ id: 'unpriced' }),
        ],
        { isSecret: true },
      ),
    ];
    const result = evaluate('CATEGORY', {
      categories,
      prices: prices({ bowl: 100, off: 100, unpriced: null }),
      hiddenDishIds: new Set(['bowl']),
    });
    expect(dishIds(result)).toEqual([]);
    expect(result.categories).toHaveLength(1); // direct category stays addressable, but empty
  });

  it('excludes inactive categories, menu items and dishes', () => {
    const categories = [
      rawCategory('inactive-category', [rawDish({ id: 'a' })], {
        isActive: false,
      }),
      rawCategory('live', [
        { dish: rawDish({ id: 'b' }), isActive: false },
        rawDish({ id: 'c', isActive: false }),
        rawDish({ id: 'd' }),
      ]),
    ];
    expect(
      dishIds(
        evaluate('ORDER', {
          categories,
          prices: prices({ a: 1, b: 1, c: 1, d: 1 }),
        }),
      ),
    ).toEqual(['d']);
  });

  it('excludes unpriced dishes (missing price is unavailable)', () => {
    const result = evaluate('ORDER', {
      categories: [rawCategory('mains', [bowl, wrap])],
      prices: prices({ bowl: 100, wrap: null }),
    });
    expect(dishIds(result)).toEqual(['bowl']);
  });

  it('drops inactive or unpriced Options and inactive Portions; a missing Option price is never free', () => {
    const dish = rawDish({
      id: 'custom',
      groups: [
        {
          id: 'protein',
          options: [
            { id: 'paneer' },
            { id: 'tofu', isActive: false },
            { id: 'chicken' },
          ],
        },
        {
          id: 'size',
          usesPortions: true,
          options: [{ id: 'rice' }],
          portions: [{ id: 'small' }, { id: 'large', isActive: false }],
        },
      ],
    });
    const result = evaluate('ORDER', {
      categories: [rawCategory('mains', [dish])],
      prices: prices(
        { custom: 300 },
        { paneer: 50, tofu: 50, chicken: null, rice: 0 },
      ),
    });
    const [protein, size] = result.dishesById.get('custom')!.groups;
    expect(protein!.options.map(({ optionId }) => optionId)).toEqual([
      'paneer',
    ]);
    expect(size!.portions.map(({ portionSizeId }) => portionSizeId)).toEqual([
      'small',
    ]);
  });

  it('makes a dish unorderable when a required group has no valid selection', () => {
    const noOption = rawDish({
      id: 'a',
      groups: [{ id: 'g', isRequired: true, options: [{ id: 'x' }] }],
    });
    const noPortion = rawDish({
      id: 'b',
      groups: [
        {
          id: 'g2',
          isRequired: true,
          usesPortions: true,
          options: [{ id: 'y' }],
          portions: [{ id: 'p', isActive: false }],
        },
      ],
    });
    const optionalEmpty = rawDish({
      id: 'c',
      groups: [
        {
          id: 'g3',
          isRequired: false,
          options: [{ id: 'z', isActive: false }],
        },
      ],
    });
    const result = evaluate('ORDER', {
      categories: [rawCategory('mains', [noOption, noPortion, optionalEmpty])],
      prices: prices({ a: 1, b: 1, c: 1 }, { x: null, y: 1, z: 1 }),
    });
    expect(dishIds(result)).toEqual(['c']);
    expect(result.dishesById.get('c')!.groups[0]!.options).toEqual([]);
  });

  it('removes empty categories from normal preview', () => {
    const categories = [
      rawCategory('empty', [rawDish({ id: 'unpriced' })]),
      rawCategory('mains', [bowl]),
    ];
    expect(
      evaluate('PREVIEW', {
        categories,
        prices: prices({ unpriced: null, bowl: 100 }),
      }).categories.map(({ category }) => category.id),
    ).toEqual(['mains']);
  });

  it('gives allergy and dietary context as warnings without blocking', () => {
    const peanut = rawDish({ id: 'satay', allergenIds: ['peanut'] });
    const result = buildOrderableMenu({
      scope: 'PREVIEW',
      categories: [rawCategory('mains', [peanut])],
      hiddenCategoryIds: new Set(),
      hiddenDishIds: new Set(),
      prices: prices({ satay: 100 }),
      preferences: {
        allergenIds: new Set(['peanut']),
        dietaryTagIds: new Set(),
      },
    });
    expect(
      result.dishesById
        .get('satay')!
        .preferenceContext.allergenWarnings.map(({ id }) => id),
    ).toEqual(['peanut']);
  });

  it('keeps preview and order validation in parity for non-secret content', () => {
    const categories = [
      rawCategory('mains', [
        bowl,
        wrap,
        rawDish({ id: 'off', isActive: false }),
        rawDish({
          id: 'req',
          groups: [
            {
              id: 'g',
              isRequired: true,
              options: [{ id: 'gone', isActive: false }],
            },
          ],
        }),
      ]),
      rawCategory('hidden', [rawDish({ id: 'hiddenCat' })]),
    ];
    const input = {
      categories,
      prices: prices(
        { bowl: 1, wrap: null, off: 1, req: 1, hiddenCat: 1 },
        { gone: 1 },
      ),
      hiddenCategoryIds: new Set(['hidden']),
    };
    expect(dishIds(evaluate('PREVIEW', input))).toEqual(
      dishIds(evaluate('ORDER', input)),
    );
  });

  it('only asks for prices of active candidates', () => {
    const categories = [
      rawCategory('mains', [
        rawDish({
          id: 'a',
          groups: [
            {
              id: 'g',
              options: [{ id: 'on' }, { id: 'off', isActive: false }],
            },
          ],
        }),
        rawDish({ id: 'b', isActive: false }),
      ]),
    ];
    expect(priceCandidates(categories)).toEqual({
      dishIds: ['a'],
      optionIds: ['on'],
    });
  });
});
