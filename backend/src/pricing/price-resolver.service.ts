import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client.js';
import { PriceTierStrategy } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { scaledPrice } from './price-resolver.utils.js';

export { roundUpToFiveCents } from './price-resolver.utils.js';

export type PriceResolution = {
  priceCents: number | null;
  source: 'OVERRIDE' | 'DERIVED' | 'MISSING';
};

export type BatchPriceResolution = {
  dishes: Map<string, PriceResolution>;
  options: Map<string, PriceResolution>;
};

/** Global client or an interactive-transaction client. */
export type PrismaDb = Prisma.TransactionClient;

export type ChainTier = {
  id: string;
  isActive: boolean;
  strategy: PriceTierStrategy;
  sourceTierId: string | null;
  costMultiplierBps: number | null;
  sourceAdjustmentBps: number | null;
};

/**
 * Tier chain from the requested tier through its TIER_PERCENTAGE sources.
 * `next[i]` is the index of tier i's source, or a deferred error that is only
 * raised if an item's resolution actually needs that source (matching the
 * lazy behaviour of the original recursive resolver).
 */
export type TierChain = {
  tiers: ChainTier[];
  next: Array<number | ConflictException | null>;
};

type ItemPriceData = {
  overrides: Map<string, Map<string, number>>; // tierId -> itemId -> cents
  activeCosts: Map<string, number>; // itemId -> cost (active items only)
};

const MISSING: PriceResolution = { priceCents: null, source: 'MISSING' };

/**
 * Pure price resolution over a preloaded chain. Semantics:
 * override first; MANUAL without override → unavailable; COST_MULTIPLIER on the
 * active item's cost; TIER_PERCENTAGE recursively from its active source; every
 * derived step rounds up to 5 cents; integer/BigInt arithmetic only.
 */
export function resolveFromChain(
  chain: TierChain,
  itemId: string,
  data: ItemPriceData,
): PriceResolution {
  const adjustments: number[] = [];
  let index = 0;
  const start = chain.tiers[0];
  if (!start?.isActive) return MISSING;

  for (;;) {
    const tier = chain.tiers[index]!;
    const override = data.overrides.get(tier.id)?.get(itemId);
    let base: PriceResolution | null = null;

    if (override !== undefined) {
      base = { priceCents: override, source: 'OVERRIDE' };
    } else if (tier.strategy === PriceTierStrategy.MANUAL) {
      return MISSING;
    } else if (tier.strategy === PriceTierStrategy.COST_MULTIPLIER) {
      if (tier.costMultiplierBps === null)
        throw new ConflictException('Cost multiplier tier is misconfigured.');
      const cost = data.activeCosts.get(itemId);
      if (cost === undefined) return MISSING;
      base = {
        priceCents: scaledPrice(cost, tier.costMultiplierBps),
        source: 'DERIVED',
      };
    } else {
      if (!tier.sourceTierId || tier.sourceAdjustmentBps === null)
        throw new ConflictException('Source tier pricing is misconfigured.');
      const next = chain.next[index];
      if (next instanceof ConflictException) throw next;
      if (typeof next !== 'number')
        throw new ConflictException(
          'A derived tier cannot use an inactive source tier.',
        );
      adjustments.push(tier.sourceAdjustmentBps);
      index = next;
      continue;
    }

    let price = base.priceCents!;
    for (let step = adjustments.length - 1; step >= 0; step--)
      price = scaledPrice(price, 10_000 + adjustments[step]!);
    return adjustments.length ? { priceCents: price, source: 'DERIVED' } : base;
  }
}

@Injectable()
export class PriceResolverService {
  constructor(private readonly prisma: PrismaService) {}

  async resolveTierForCompany(
    companyId: string,
    db: PrismaDb = this.prisma,
  ): Promise<string> {
    const company = await db.company.findUnique({
      where: { id: companyId },
      select: { priceTierId: true },
    });
    if (!company) throw new NotFoundException('Company not found.');
    if (company.priceTierId) {
      const tier = await db.priceTier.findFirst({
        where: { id: company.priceTierId, isActive: true },
        select: { id: true },
      });
      if (!tier)
        throw new ConflictException(
          'The company price tier is inactive or missing.',
        );
      return tier.id;
    }
    return this.getDefaultTierId(db);
  }

  async resolveTierForEmployee(
    employeeId: string,
    db: PrismaDb = this.prisma,
  ): Promise<string> {
    const employee = await db.employee.findUnique({
      where: { id: employeeId },
      select: { companyId: true },
    });
    if (!employee) throw new NotFoundException('Employee not found.');
    return this.resolveTierForCompany(employee.companyId, db);
  }

  async getDefaultTierId(db: PrismaDb = this.prisma): Promise<string> {
    const defaults = await db.priceTier.findMany({
      where: { isActive: true, isDefault: true },
      select: { id: true },
      take: 2,
    });
    if (defaults.length !== 1)
      throw new ConflictException(
        'Pricing requires exactly one active default tier.',
      );
    return defaults[0]!.id;
  }

  async resolveDishPrice(
    tierId: string,
    dishId: string,
    db: PrismaDb = this.prisma,
  ): Promise<PriceResolution> {
    return (
      await this.resolvePrices(tierId, { dishIds: [dishId] }, db)
    ).dishes.get(dishId)!;
  }

  async resolveOptionPrice(
    tierId: string,
    optionId: string,
    db: PrismaDb = this.prisma,
  ): Promise<PriceResolution> {
    return (
      await this.resolvePrices(tierId, { optionIds: [optionId] }, db)
    ).options.get(optionId)!;
  }

  /** Resolves many Dish and Option prices with a bounded number of queries (chain depth + 4). */
  async resolvePrices(
    tierId: string,
    items: { dishIds?: readonly string[]; optionIds?: readonly string[] },
    db: PrismaDb = this.prisma,
  ): Promise<BatchPriceResolution> {
    const dishIds = [...new Set(items.dishIds ?? [])];
    const optionIds = [...new Set(items.optionIds ?? [])];
    const chain = await this.loadTierChain(tierId, db);
    const chainIds = chain.tiers.map(({ id }) => id);

    const [dishOverrides, optionOverrides, dishCosts, optionCosts] =
      await Promise.all([
        dishIds.length && chainIds.length
          ? db.dishTierPrice.findMany({
              where: { priceTierId: { in: chainIds }, dishId: { in: dishIds } },
              select: { priceTierId: true, dishId: true, priceCents: true },
            })
          : [],
        optionIds.length && chainIds.length
          ? db.optionTierPrice.findMany({
              where: {
                priceTierId: { in: chainIds },
                optionId: { in: optionIds },
              },
              select: { priceTierId: true, optionId: true, priceCents: true },
            })
          : [],
        dishIds.length
          ? db.dish.findMany({
              where: { id: { in: dishIds }, isActive: true },
              select: { id: true, costCents: true },
            })
          : [],
        optionIds.length
          ? db.option.findMany({
              where: { id: { in: optionIds }, isActive: true },
              select: { id: true, costCents: true },
            })
          : [],
      ]);

    const group = (
      rows: Array<{ priceTierId: string; itemId: string; priceCents: number }>,
    ) => {
      const map = new Map<string, Map<string, number>>();
      for (const { priceTierId, itemId, priceCents } of rows) {
        if (!map.has(priceTierId)) map.set(priceTierId, new Map());
        map.get(priceTierId)!.set(itemId, priceCents);
      }
      return map;
    };
    const dishData: ItemPriceData = {
      overrides: group(
        dishOverrides.map(({ dishId, ...row }) => ({ ...row, itemId: dishId })),
      ),
      activeCosts: new Map(
        dishCosts.map(({ id, costCents }) => [id, costCents]),
      ),
    };
    const optionData: ItemPriceData = {
      overrides: group(
        optionOverrides.map(({ optionId, ...row }) => ({
          ...row,
          itemId: optionId,
        })),
      ),
      activeCosts: new Map(
        optionCosts.map(({ id, costCents }) => [id, costCents]),
      ),
    };

    return {
      dishes: new Map(
        dishIds.map((id) => [id, resolveFromChain(chain, id, dishData)]),
      ),
      options: new Map(
        optionIds.map((id) => [id, resolveFromChain(chain, id, optionData)]),
      ),
    };
  }

  private async loadTierChain(
    tierId: string,
    db: PrismaDb,
  ): Promise<TierChain> {
    const select = {
      id: true,
      isActive: true,
      strategy: true,
      sourceTierId: true,
      costMultiplierBps: true,
      sourceAdjustmentBps: true,
    } as const;
    const chain: TierChain = { tiers: [], next: [] };
    const start = await db.priceTier.findUnique({
      where: { id: tierId },
      select,
    });
    if (!start) return chain;
    chain.tiers.push(start);
    const indexById = new Map([[start.id, 0]]);

    for (let index = 0; index < chain.tiers.length; index++) {
      const tier = chain.tiers[index]!;
      chain.next[index] = null;
      if (
        !tier.isActive ||
        tier.strategy !== PriceTierStrategy.TIER_PERCENTAGE ||
        !tier.sourceTierId
      )
        continue;
      const source = await db.priceTier.findFirst({
        where: { id: tier.sourceTierId, isActive: true },
        select,
      });
      if (!source) {
        chain.next[index] = new ConflictException(
          'A derived tier cannot use an inactive source tier.',
        );
      } else if (indexById.has(source.id)) {
        chain.next[index] = new ConflictException('Price tier cycle detected.');
      } else {
        indexById.set(source.id, chain.tiers.length);
        chain.next[index] = chain.tiers.length;
        chain.tiers.push(source);
      }
    }
    return chain;
  }
}
