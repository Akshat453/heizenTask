import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  PriceResolverService,
  type PrismaDb,
} from '../pricing/price-resolver.service.js';
import {
  buildOrderableMenu,
  orderableDishInclude,
  type OrderabilityResult,
  type OrderabilityScope,
  priceCandidates,
} from './orderability.policy.js';

const employeeSelect = {
  id: true,
  name: true,
  companyId: true,
  defaultDeliveryAddressId: true,
  canChooseDeliveryAddress: true,
  canChangeDeliveryTime: true,
  canChangePackaging: true,
  allergens: { select: { allergen: { select: { id: true, name: true } } } },
  dietaryTags: { select: { dietaryTag: { select: { id: true, name: true } } } },
} as const;

export type OrderableMenu = OrderabilityResult & {
  /** Rows in the company's hidden lists (CompanyHiddenCategory / CompanyHiddenDish). */
  hiddenCategoryCount: number;
  hiddenDishCount: number;
  employee: {
    id: string;
    name: string;
    companyId: string;
    defaultDeliveryAddressId: string | null;
    canChooseDeliveryAddress: boolean;
    canChangeDeliveryTime: boolean;
    canChangePackaging: boolean;
    allergens: Array<{ allergen: { id: string; name: string } }>;
    dietaryTags: Array<{ dietaryTag: { id: string; name: string } }>;
  };
  tierId: string;
};

@Injectable()
export class OrderabilityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly resolver: PriceResolverService,
  ) {}

  /**
   * Loads the Employee's menu for their current Company and applies the shared
   * orderability policy. Pass `db` to run inside an existing transaction.
   */
  async loadMenu(
    employeeId: string,
    options: {
      scope: OrderabilityScope;
      slug?: string;
      dishIds?: readonly string[];
      db?: PrismaDb;
    },
  ): Promise<OrderableMenu> {
    const db = options.db ?? this.prisma;
    const employee = await db.employee.findUnique({
      where: { id: employeeId },
      select: employeeSelect,
    });
    if (!employee) throw new NotFoundException('Employee not found.');

    const tierId = await this.resolver.resolveTierForCompany(
      employee.companyId,
      db,
    );
    const [categories, hiddenCategories, hiddenDishes] = await Promise.all([
      db.menuCategory.findMany({
        where:
          options.slug !== undefined
            ? { slug: options.slug }
            : options.scope === 'PREVIEW'
              ? { isSecret: false }
              : {},
        orderBy: { displayOrder: 'asc' },
        include: {
          items: {
            where: options.dishIds
              ? { dishId: { in: [...options.dishIds] } }
              : undefined,
            orderBy: { displayOrder: 'asc' },
            include: { dish: { include: orderableDishInclude } },
          },
        },
      }),
      db.companyHiddenCategory.findMany({
        where: { companyId: employee.companyId },
        select: { categoryId: true },
      }),
      db.companyHiddenDish.findMany({
        where: { companyId: employee.companyId },
        select: { dishId: true },
      }),
    ]);

    const prices = await this.resolver.resolvePrices(
      tierId,
      priceCandidates(categories),
      db,
    );
    const result = buildOrderableMenu({
      scope: options.scope,
      categories,
      hiddenCategoryIds: new Set(
        hiddenCategories.map(({ categoryId }) => categoryId),
      ),
      hiddenDishIds: new Set(hiddenDishes.map(({ dishId }) => dishId)),
      prices,
      preferences: {
        allergenIds: new Set(
          employee.allergens.map(({ allergen }) => allergen.id),
        ),
        dietaryTagIds: new Set(
          employee.dietaryTags.map(({ dietaryTag }) => dietaryTag.id),
        ),
      },
    });

    return {
      ...result,
      employee,
      tierId,
      hiddenCategoryCount: hiddenCategories.length,
      hiddenDishCount: hiddenDishes.length,
    };
  }
}
