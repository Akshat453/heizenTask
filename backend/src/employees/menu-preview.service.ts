import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { OrderableDish } from '../menu/orderability.policy.js';
import {
  type OrderableMenu,
  OrderabilityService,
} from '../menu/orderability.service.js';

@Injectable()
export class MenuPreviewService {
  constructor(
    private readonly orderability: OrderabilityService,
    private readonly prisma: PrismaService,
  ) {}

  async preview(employeeId: string) {
    const menu = await this.orderability.loadMenu(employeeId, {
      scope: 'PREVIEW',
    });
    return { ...this.serialize(menu), rules: await this.rules(menu) };
  }

  /** Why the preview looks the way it does (counts only; no hidden or unpriced items listed). */
  private async rules(menu: OrderableMenu) {
    const [tier, company] = await Promise.all([
      this.prisma.priceTier.findUnique({
        where: { id: menu.tierId },
        select: { name: true },
      }),
      this.prisma.company.findUnique({
        where: { id: menu.employee.companyId },
        select: { priceTierId: true },
      }),
    ]);
    return {
      tierId: menu.tierId,
      tierName: tier?.name ?? null,
      usedDefaultTier: !company?.priceTierId,
      hiddenCategoryCount: menu.hiddenCategoryCount,
      hiddenDishCount: menu.hiddenDishCount,
      unpricedDishCount: menu.unpricedDishIds.size,
    };
  }

  async previewCategory(employeeId: string, slug: string) {
    const menu = await this.orderability.loadMenu(employeeId, {
      scope: 'CATEGORY',
      slug,
    });
    if (menu.categories.length === 0)
      throw new NotFoundException('Menu category is unavailable.');
    return this.serialize(menu);
  }

  private serialize(menu: OrderableMenu) {
    return {
      employee: {
        id: menu.employee.id,
        name: menu.employee.name,
        companyId: menu.employee.companyId,
      },
      tierId: menu.tierId,
      preferences: {
        allergens: menu.employee.allergens.map(({ allergen }) => allergen),
        dietaryTags: menu.employee.dietaryTags.map(
          ({ dietaryTag }) => dietaryTag,
        ),
        blocking: false,
      },
      categories: menu.categories.map(({ category, dishes }) => ({
        id: category.id,
        name: category.name,
        slug: category.slug,
        displayOrder: category.displayOrder,
        isSecret: category.isSecret,
        dishes: dishes.map(({ displayOrder, dish }) =>
          this.serializeDish(dish, displayOrder),
        ),
      })),
    };
  }

  private serializeDish(orderable: OrderableDish, displayOrder: number) {
    const { optionGroups: _optionGroups, ...dish } = orderable.dish;
    return {
      ...dish,
      displayOrder,
      resolvedPriceCents: orderable.priceCents,
      priceSource: orderable.priceSource,
      optionGroups: orderable.groups.map((group) => ({
        id: group.id,
        name: group.name,
        isRequired: group.isRequired,
        usesPortions: group.usesPortions,
        displayOrder: group.displayOrder,
        options: group.options.map(({ option, priceCents, priceSource }) => ({
          ...option,
          resolvedPriceCents: priceCents,
          priceSource,
        })),
        portions: group.portions.map(
          ({ portionSize, extraChargeCents, displayOrder: portionOrder }) => ({
            ...portionSize,
            extraChargeCents,
            displayOrder: portionOrder,
          }),
        ),
      })),
      preferenceContext: orderable.preferenceContext,
    };
  }
}
