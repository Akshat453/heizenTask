import { ConflictException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { PriceTierStrategy } from '../generated/prisma/enums.js';
import {
  type ChainTier,
  resolveFromChain,
  type TierChain,
} from './price-resolver.service.js';

const tier = (
  id: string,
  strategy: PriceTierStrategy,
  extra: Partial<ChainTier> = {},
): ChainTier => ({
  id,
  isActive: true,
  strategy,
  sourceTierId: null,
  costMultiplierBps: null,
  sourceAdjustmentBps: null,
  ...extra,
});

const data = (
  overrides: Record<string, Record<string, number>> = {},
  costs: Record<string, number> = {},
) => ({
  overrides: new Map(
    Object.entries(overrides).map(([tierId, items]) => [
      tierId,
      new Map(Object.entries(items)),
    ]),
  ),
  activeCosts: new Map(Object.entries(costs)),
});

describe('resolveFromChain (batched PriceResolver core)', () => {
  const manual: TierChain = {
    tiers: [tier('manual', PriceTierStrategy.MANUAL)],
    next: [null],
  };

  it('uses an explicit override first', () => {
    expect(
      resolveFromChain(manual, 'dish', data({ manual: { dish: 450 } })),
    ).toEqual({ priceCents: 450, source: 'OVERRIDE' });
  });

  it('treats a MANUAL tier without an override as unavailable', () => {
    expect(resolveFromChain(manual, 'dish', data())).toEqual({
      priceCents: null,
      source: 'MISSING',
    });
  });

  it('derives COST_MULTIPLIER prices from active item cost and rounds up to 5 cents', () => {
    const chain: TierChain = {
      tiers: [
        tier('cost', PriceTierStrategy.COST_MULTIPLIER, {
          costMultiplierBps: 24_000,
        }),
      ],
      next: [null],
    };
    expect(resolveFromChain(chain, 'dish', data({}, { dish: 99 }))).toEqual({
      priceCents: 240,
      source: 'DERIVED',
    });
    // Inactive items have no active cost → unavailable, never free.
    expect(resolveFromChain(chain, 'inactive', data({}, {}))).toEqual({
      priceCents: null,
      source: 'MISSING',
    });
  });

  it('applies TIER_PERCENTAGE recursively, rounding at every derived step (210/211/214/215/216)', () => {
    const chain: TierChain = {
      tiers: [
        tier('top', PriceTierStrategy.TIER_PERCENTAGE, {
          sourceTierId: 'mid',
          sourceAdjustmentBps: 0,
        }),
        tier('mid', PriceTierStrategy.TIER_PERCENTAGE, {
          sourceTierId: 'base',
          sourceAdjustmentBps: 0,
        }),
        tier('base', PriceTierStrategy.MANUAL),
      ],
      next: [1, 2, null],
    };
    const prices = { 210: 210, 211: 215, 214: 215, 215: 215, 216: 220 };
    for (const [base, expected] of Object.entries(prices)) {
      expect(
        resolveFromChain(chain, 'dish', data({ base: { dish: Number(base) } })),
      ).toEqual({ priceCents: expected, source: 'DERIVED' });
    }
    // +10% twice with rounding at each step: 211 → 235 (232.1↑) → 260 (258.5↑)
    const tenPercent: TierChain = {
      tiers: [
        tier('top', PriceTierStrategy.TIER_PERCENTAGE, {
          sourceTierId: 'mid',
          sourceAdjustmentBps: 1_000,
        }),
        tier('mid', PriceTierStrategy.TIER_PERCENTAGE, {
          sourceTierId: 'base',
          sourceAdjustmentBps: 1_000,
        }),
        tier('base', PriceTierStrategy.MANUAL),
      ],
      next: [1, 2, null],
    };
    expect(
      resolveFromChain(tenPercent, 'dish', data({ base: { dish: 211 } }))
        .priceCents,
    ).toBe(260);
  });

  it('returns unavailable when an inactive starting tier is requested', () => {
    const chain: TierChain = {
      tiers: [tier('off', PriceTierStrategy.MANUAL, { isActive: false })],
      next: [null],
    };
    expect(
      resolveFromChain(chain, 'dish', data({ off: { dish: 100 } })),
    ).toEqual({ priceCents: null, source: 'MISSING' });
  });

  it('rejects inactive sources and cycles only when resolution needs the source', () => {
    const inactiveSource: TierChain = {
      tiers: [
        tier('derived', PriceTierStrategy.TIER_PERCENTAGE, {
          sourceTierId: 'gone',
          sourceAdjustmentBps: 500,
        }),
      ],
      next: [
        new ConflictException(
          'A derived tier cannot use an inactive source tier.',
        ),
      ],
    };
    expect(() => resolveFromChain(inactiveSource, 'dish', data())).toThrow(
      /inactive source/,
    );
    // An override on the derived tier is used before the source is consulted.
    expect(
      resolveFromChain(
        inactiveSource,
        'dish',
        data({ derived: { dish: 300 } }),
      ),
    ).toEqual({ priceCents: 300, source: 'OVERRIDE' });

    const cycle: TierChain = {
      tiers: [
        tier('a', PriceTierStrategy.TIER_PERCENTAGE, {
          sourceTierId: 'a',
          sourceAdjustmentBps: 0,
        }),
      ],
      next: [new ConflictException('Price tier cycle detected.')],
    };
    expect(() => resolveFromChain(cycle, 'dish', data())).toThrow(/cycle/);
  });

  it('propagates a missing base price through derived tiers as unavailable', () => {
    const chain: TierChain = {
      tiers: [
        tier('derived', PriceTierStrategy.TIER_PERCENTAGE, {
          sourceTierId: 'base',
          sourceAdjustmentBps: 500,
        }),
        tier('base', PriceTierStrategy.MANUAL),
      ],
      next: [1, null],
    };
    expect(resolveFromChain(chain, 'dish', data())).toEqual({
      priceCents: null,
      source: 'MISSING',
    });
  });
});
