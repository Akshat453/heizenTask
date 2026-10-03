import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PriceTierStrategy } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { roundUpToFiveCents, scaledPrice } from './price-resolver.utils.js';

export { roundUpToFiveCents } from './price-resolver.utils.js';


export type PriceResolution = {
  priceCents: number | null;
  source: 'OVERRIDE' | 'DERIVED' | 'MISSING';
};

@Injectable()
export class PriceResolverService {
  constructor(private readonly prisma: PrismaService) {}


  async resolveTierForCompany(companyId: string): Promise<string> {
    const company = await this.prisma.company.findUnique({ where: { id: companyId }, select: { priceTierId: true } });
    if (!company) throw new NotFoundException('Company not found.');
    if (company.priceTierId) {
      const tier = await this.prisma.priceTier.findFirst({ where: { id: company.priceTierId, isActive: true }, select: { id: true } });
      if (!tier) throw new ConflictException('The company price tier is inactive or missing.');
      return tier.id;
    }
    return this.getDefaultTierId();
  }

  async resolveTierForEmployee(employeeId: string): Promise<string> {
    const employee = await this.prisma.employee.findUnique({ where: { id: employeeId }, select: { companyId: true } });
    if (!employee) throw new NotFoundException('Employee not found.');
    return this.resolveTierForCompany(employee.companyId);
  }

  async getDefaultTierId(): Promise<string> {
    const defaults = await this.prisma.priceTier.findMany({ where: { isActive: true, isDefault: true }, select: { id: true }, take: 2 });
    if (defaults.length !== 1) throw new ConflictException('Pricing requires exactly one active default tier.');
    return defaults[0]!.id;
  }

  resolveDishPrice(tierId: string, dishId: string): Promise<PriceResolution> {
    return this.resolve('dish', tierId, dishId, new Set());
  }

  resolveOptionPrice(tierId: string, optionId: string): Promise<PriceResolution> {
    return this.resolve('option', tierId, optionId, new Set());
  }

  private async resolve(kind: 'dish' | 'option', tierId: string, itemId: string, visited: Set<string>): Promise<PriceResolution> {
    if (visited.has(tierId)) throw new ConflictException('Price tier cycle detected.');
    visited.add(tierId);
    const tier = await this.prisma.priceTier.findUnique({ where: { id: tierId }, select: {
      id: true, isActive: true, strategy: true, sourceTierId: true, costMultiplierBps: true, sourceAdjustmentBps: true,
      dishPrices: kind === 'dish' ? { where: { dishId: itemId }, select: { priceCents: true }, take: 1 } : false,
      optionPrices: kind === 'option' ? { where: { optionId: itemId }, select: { priceCents: true }, take: 1 } : false,
    } });
    if (!tier?.isActive) return { priceCents: null, source: 'MISSING' };
    const override = kind === 'dish' ? tier.dishPrices?.[0]?.priceCents : tier.optionPrices?.[0]?.priceCents;
    if (override !== undefined) return { priceCents: override, source: 'OVERRIDE' };
    if (tier.strategy === PriceTierStrategy.MANUAL) return { priceCents: null, source: 'MISSING' };
    if (tier.strategy === PriceTierStrategy.COST_MULTIPLIER) {
      if (tier.costMultiplierBps === null) throw new ConflictException('Cost multiplier tier is misconfigured.');
      const item = kind === 'dish'
        ? await this.prisma.dish.findFirst({ where: { id: itemId, isActive: true }, select: { costCents: true } })
        : await this.prisma.option.findFirst({ where: { id: itemId, isActive: true }, select: { costCents: true } });
      return item ? { priceCents: scaledPrice(item.costCents, tier.costMultiplierBps), source: 'DERIVED' } : { priceCents: null, source: 'MISSING' };
    }
    if (!tier.sourceTierId || tier.sourceAdjustmentBps === null) throw new ConflictException('Source tier pricing is misconfigured.');
    const source = await this.prisma.priceTier.findFirst({ where: { id: tier.sourceTierId, isActive: true }, select: { id: true } });
    if (!source) throw new ConflictException('A derived tier cannot use an inactive source tier.');
    const base = await this.resolve(kind, source.id, itemId, visited);
    if (base.priceCents === null) return { priceCents: null, source: 'MISSING' };
    return { priceCents: scaledPrice(base.priceCents, 10_000 + tier.sourceAdjustmentBps), source: 'DERIVED' };
  }
}
