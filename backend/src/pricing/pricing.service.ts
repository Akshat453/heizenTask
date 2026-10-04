import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { PriceTierStrategy } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type {
  CreatePriceTierDto,
  UpdatePriceTierDto,
  UpdateTierPricesDto,
} from './dto/pricing.dto.js';
import { PriceResolverService } from './price-resolver.service.js';

type TierConfig = {
  strategy: PriceTierStrategy;
  sourceTierId: string | null;
  costMultiplierBps: number | null;
  sourceAdjustmentBps: number | null;
  isActive: boolean;
  isDefault: boolean;
};

/**
 * Fixed transaction-scoped advisory lock key that serializes every PriceTier
 * configuration mutation (isDefault, isActive, strategy, source relationships).
 */
export const PRICE_TIER_CONFIG_LOCK_KEY = 7_340_215_904_118_001n;

@Injectable()
export class PricingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly resolver: PriceResolverService,
  ) {}

  listTiers() {
    return this.prisma.priceTier.findMany({
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
      include: {
        sourceTier: { select: { id: true, name: true, isActive: true } },
        _count: {
          select: { companies: true, dishPrices: true, optionPrices: true },
        },
      },
    });
  }

  async getTier(id: string) {
    const tier = await this.prisma.priceTier.findUnique({
      where: { id },
      include: { sourceTier: true },
    });
    if (!tier) throw new NotFoundException('Price tier not found.');
    return tier;
  }

  async createTier(dto: CreatePriceTierDto) {
    return this.prisma
      .$transaction(async (tx) => {
        await this.lockTierConfiguration(tx);
        const config: TierConfig = {
          strategy: dto.strategy,
          sourceTierId: dto.sourceTierId ?? null,
          costMultiplierBps: dto.costMultiplierBps ?? null,
          sourceAdjustmentBps: dto.sourceAdjustmentBps ?? null,
          isActive: dto.isActive ?? true,
          isDefault: dto.isDefault ?? false,
        };
        await this.validateConfig(tx, config);
        if (config.isDefault)
          await tx.priceTier.updateMany({
            where: { isDefault: true },
            data: { isDefault: false },
          });
        const tier = await tx.priceTier.create({
          data: { name: dto.name.trim(), ...config },
        });
        await this.assertGlobalInvariants(tx);
        return tier;
      })
      .catch((error: unknown) => this.rethrowPricingError(error));
  }

  async updateTier(id: string, dto: UpdatePriceTierDto) {
    return this.prisma
      .$transaction(async (tx) => {
        await this.lockTierConfiguration(tx);
        const current = await tx.priceTier.findUnique({ where: { id } });
        if (!current) throw new NotFoundException('Price tier not found.');
        const config: TierConfig = {
          strategy: dto.strategy ?? current.strategy,
          sourceTierId:
            dto.sourceTierId === undefined
              ? current.sourceTierId
              : dto.sourceTierId,
          costMultiplierBps:
            dto.costMultiplierBps === undefined
              ? current.costMultiplierBps
              : dto.costMultiplierBps,
          sourceAdjustmentBps:
            dto.sourceAdjustmentBps === undefined
              ? current.sourceAdjustmentBps
              : dto.sourceAdjustmentBps,
          isActive: dto.isActive ?? current.isActive,
          isDefault: dto.isDefault ?? current.isDefault,
        };
        await this.validateConfig(tx, config, id);
        if (config.isDefault)
          await tx.priceTier.updateMany({
            where: { isDefault: true, id: { not: id } },
            data: { isDefault: false },
          });
        const tier = await tx.priceTier.update({
          where: { id },
          data: {
            ...(dto.name === undefined ? {} : { name: dto.name.trim() }),
            ...config,
          },
        });
        await this.assertGlobalInvariants(tx);
        return tier;
      })
      .catch((error: unknown) => this.rethrowPricingError(error));
  }

  async editor(id: string) {
    const tier = await this.getTier(id);
    const [dishes, options] = await Promise.all([
      this.prisma.dish.findMany({
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          sku: true,
          costCents: true,
          isActive: true,
          tierPrices: {
            where: { priceTierId: id },
            select: { priceCents: true },
          },
        },
      }),
      this.prisma.option.findMany({
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          costCents: true,
          isActive: true,
          tierPrices: {
            where: { priceTierId: id },
            select: { priceCents: true },
          },
        },
      }),
    ]);
    const resolved = await this.resolver.resolvePrices(id, {
      dishIds: dishes.map((dish) => dish.id),
      optionIds: options.map((option) => option.id),
    });
    return {
      tier,
      dishes: dishes.map(({ tierPrices, ...dish }) => ({
        ...dish,
        overridePriceCents: tierPrices[0]?.priceCents ?? null,
        ...resolved.dishes.get(dish.id)!,
      })),
      options: options.map(({ tierPrices, ...option }) => ({
        ...option,
        overridePriceCents: tierPrices[0]?.priceCents ?? null,
        ...resolved.options.get(option.id)!,
      })),
    };
  }

  async updatePrices(id: string, dto: UpdateTierPricesDto) {
    this.assertUniqueItems(
      dto.dishOverrides.map(({ itemId }) => itemId),
      'dish',
    );
    this.assertUniqueItems(
      dto.optionOverrides.map(({ itemId }) => itemId),
      'option',
    );
    return this.prisma.$transaction(async (tx) => {
      if (
        !(await tx.priceTier.findUnique({
          where: { id },
          select: { id: true },
        }))
      )
        throw new NotFoundException('Price tier not found.');
      const [dishCount, optionCount] = await Promise.all([
        tx.dish.count({
          where: { id: { in: dto.dishOverrides.map(({ itemId }) => itemId) } },
        }),
        tx.option.count({
          where: {
            id: { in: dto.optionOverrides.map(({ itemId }) => itemId) },
          },
        }),
      ]);
      if (
        dishCount !== dto.dishOverrides.length ||
        optionCount !== dto.optionOverrides.length
      )
        throw new BadRequestException('One or more price items are invalid.');
      for (const value of dto.dishOverrides) {
        if (value.priceCents === null)
          await tx.dishTierPrice.deleteMany({
            where: { dishId: value.itemId, priceTierId: id },
          });
        else
          await tx.dishTierPrice.upsert({
            where: {
              dishId_priceTierId: { dishId: value.itemId, priceTierId: id },
            },
            create: {
              dishId: value.itemId,
              priceTierId: id,
              priceCents: value.priceCents,
            },
            update: { priceCents: value.priceCents },
          });
      }
      for (const value of dto.optionOverrides) {
        if (value.priceCents === null)
          await tx.optionTierPrice.deleteMany({
            where: { optionId: value.itemId, priceTierId: id },
          });
        else
          await tx.optionTierPrice.upsert({
            where: {
              optionId_priceTierId: { optionId: value.itemId, priceTierId: id },
            },
            create: {
              optionId: value.itemId,
              priceTierId: id,
              priceCents: value.priceCents,
            },
            update: { priceCents: value.priceCents },
          });
      }
      return { success: true } as const;
    });
  }

  private async validateConfig(
    tx: Prisma.TransactionClient,
    config: TierConfig,
    selfId?: string,
  ) {
    if (config.isDefault && !config.isActive)
      throw new BadRequestException('The default price tier must be active.');
    if (config.strategy === PriceTierStrategy.MANUAL) {
      if (
        config.sourceTierId !== null ||
        config.costMultiplierBps !== null ||
        config.sourceAdjustmentBps !== null
      )
        throw new BadRequestException(
          'Manual tiers cannot define derivation fields.',
        );
    } else if (config.strategy === PriceTierStrategy.COST_MULTIPLIER) {
      if (
        config.costMultiplierBps === null ||
        config.sourceTierId !== null ||
        config.sourceAdjustmentBps !== null
      )
        throw new BadRequestException(
          'Cost multiplier tiers require only costMultiplierBps.',
        );
    } else {
      if (
        !config.sourceTierId ||
        config.sourceAdjustmentBps === null ||
        config.costMultiplierBps !== null
      )
        throw new BadRequestException(
          'Tier percentage pricing requires an active source and sourceAdjustmentBps.',
        );
      if (config.sourceTierId === selfId)
        throw new BadRequestException('A price tier cannot reference itself.');
      const source = await tx.priceTier.findFirst({
        where: { id: config.sourceTierId, isActive: true },
        select: { id: true, sourceTierId: true },
      });
      if (!source)
        throw new BadRequestException(
          'A derived tier requires an active source tier.',
        );
      const visited = new Set(selfId ? [selfId] : []);
      let cursor: string | null = source.id;
      while (cursor) {
        if (visited.has(cursor))
          throw new BadRequestException('Price tier cycle detected.');
        visited.add(cursor);
        const next: { sourceTierId: string | null } | null =
          await tx.priceTier.findUnique({
            where: { id: cursor },
            select: { sourceTierId: true },
          });
        cursor = next?.sourceTierId ?? null;
      }
    }
  }

  private async lockTierConfiguration(tx: Prisma.TransactionClient) {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${PRICE_TIER_CONFIG_LOCK_KEY}::bigint)`;
  }

  private async assertGlobalInvariants(tx: Prisma.TransactionClient) {
    if (
      (await tx.priceTier.count({
        where: { isActive: true, isDefault: true },
      })) !== 1
    )
      throw new BadRequestException(
        'Every tier mutation must leave exactly one active default tier.',
      );
    const invalidDerived = await tx.priceTier.count({
      where: {
        isActive: true,
        strategy: PriceTierStrategy.TIER_PERCENTAGE,
        OR: [
          { sourceTierId: null },
          { sourceTier: { is: { isActive: false } } },
        ],
      },
    });
    if (invalidDerived)
      throw new BadRequestException(
        'An active derived tier cannot depend on a missing or inactive source tier.',
      );
  }

  private assertUniqueItems(ids: string[], label: string) {
    if (new Set(ids).size !== ids.length)
      throw new BadRequestException(
        `Duplicate ${label} overrides are not allowed.`,
      );
  }

  private rethrowPricingError(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      if (JSON.stringify(error.meta ?? {}).includes('single_active_default'))
        throw new ConflictException(
          'Another active default price tier already exists.',
        );
      throw new ConflictException(
        'A price tier with this name already exists.',
      );
    }
    throw error;
  }
}
