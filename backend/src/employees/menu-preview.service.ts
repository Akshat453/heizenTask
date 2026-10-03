import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { PriceResolverService } from '../pricing/price-resolver.service.js';

const previewDishInclude = {
  allergens: { include: { allergen: true } }, dietaryTags: { include: { dietaryTag: true } },
  optionGroups: { orderBy: { displayOrder: 'asc' as const }, include: {
    options: { orderBy: { displayOrder: 'asc' as const }, include: { option: { include: { allergens: { include: { allergen: true } }, dietaryTags: { include: { dietaryTag: true } } } } } },
    portions: { orderBy: { displayOrder: 'asc' as const }, include: { portionSize: true } },
  } },
} satisfies Prisma.DishInclude;

@Injectable()
export class MenuPreviewService {
  constructor(private readonly prisma: PrismaService, private readonly resolver: PriceResolverService) {}

  preview(employeeId: string) { return this.build(employeeId); }
  previewCategory(employeeId: string, slug: string) { return this.build(employeeId, slug); }

  private async build(employeeId: string, slug?: string) {
    const employee = await this.prisma.employee.findUnique({ where: { id: employeeId }, select: {
      id: true, name: true, companyId: true,
      allergens: { select: { allergen: { select: { id: true, name: true } } } },
      dietaryTags: { select: { dietaryTag: { select: { id: true, name: true } } } },
    } });
    if (!employee) throw new NotFoundException('Employee not found.');
    const tierId = await this.resolver.resolveTierForCompany(employee.companyId);
    const categories = await this.prisma.menuCategory.findMany({ where: {
      isActive: true, ...(slug ? { slug } : { isSecret: false }), hiddenByCompanies: { none: { companyId: employee.companyId } },
    }, orderBy: { displayOrder: 'asc' }, include: { items: { where: {
      isActive: true, dish: { isActive: true, hiddenByCompanies: { none: { companyId: employee.companyId } } },
    }, orderBy: { displayOrder: 'asc' }, include: { dish: { include: previewDishInclude } } } } });
    if (slug && categories.length === 0) throw new NotFoundException('Menu category is unavailable.');
    const allergenIds = new Set(employee.allergens.map(({ allergen }) => allergen.id));
    const dietaryTagIds = new Set(employee.dietaryTags.map(({ dietaryTag }) => dietaryTag.id));
    const output = [];
    for (const category of categories) {
      const dishes = [];
      for (const item of category.items) {
        const dishPrice = await this.resolver.resolveDishPrice(tierId, item.dish.id);
        if (dishPrice.priceCents === null) continue;
        const groups = [];
        let requiredGroupUnavailable = false;
        for (const group of item.dish.optionGroups) {
          const options = [];
          for (const relation of group.options) {
            if (!relation.option.isActive) continue;
            const resolution = await this.resolver.resolveOptionPrice(tierId, relation.option.id);
            if (resolution.priceCents === null) continue;
            options.push({ ...relation.option, resolvedPriceCents: resolution.priceCents, priceSource: resolution.source });
          }
          const portions = group.usesPortions ? group.portions.filter(({ portionSize }) => portionSize.isActive).map(({ portionSize, ...portion }) => ({ ...portionSize, extraChargeCents: portion.extraChargeCents, displayOrder: portion.displayOrder })) : [];
          if (group.isRequired && (options.length === 0 || (group.usesPortions && portions.length === 0))) requiredGroupUnavailable = true;
          groups.push({ id: group.id, name: group.name, isRequired: group.isRequired, usesPortions: group.usesPortions, displayOrder: group.displayOrder, options, portions });
        }
        if (requiredGroupUnavailable) continue;
        const { optionGroups: _optionGroups, ...dish } = item.dish;
        dishes.push({ ...dish, displayOrder: item.displayOrder, resolvedPriceCents: dishPrice.priceCents, priceSource: dishPrice.source, optionGroups: groups,
          preferenceContext: {
            allergenWarnings: dish.allergens.map(({ allergen }) => allergen).filter(({ id }) => allergenIds.has(id)),
            matchingDietaryTags: dish.dietaryTags.map(({ dietaryTag }) => dietaryTag).filter(({ id }) => dietaryTagIds.has(id)),
          },
        });
      }
      if (dishes.length) dishes.length;
      output.push({ id: category.id, name: category.name, slug: category.slug, displayOrder: category.displayOrder, isSecret: category.isSecret, dishes });
    }
    return {
      employee: { id: employee.id, name: employee.name, companyId: employee.companyId }, tierId,
      preferences: { allergens: employee.allergens.map(({ allergen }) => allergen), dietaryTags: employee.dietaryTags.map(({ dietaryTag }) => dietaryTag), blocking: false },
      categories: output,
    };
  }
}
