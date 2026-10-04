import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

/**
 * Company hiding edited from the menu side. Each replace runs in one
 * transaction; the company-side PATCH (hiddenCategoryIds/hiddenDishIds)
 * writes the same join tables and keeps working.
 */
@Injectable()
export class MenuHidingService {
  constructor(private readonly prisma: PrismaService) {}

  replaceCategoryHiding(categoryId: string, companyIds: string[]) {
    return this.prisma.$transaction(async (tx) => {
      const category = await tx.menuCategory.findUnique({
        where: { id: categoryId },
        select: { id: true },
      });
      if (!category) throw new NotFoundException('Menu category not found.');
      await this.assertCompaniesExist(tx, companyIds);
      await tx.companyHiddenCategory.deleteMany({
        where: { categoryId, companyId: { notIn: companyIds } },
      });
      if (companyIds.length)
        await tx.companyHiddenCategory.createMany({
          data: companyIds.map((companyId) => ({ companyId, categoryId })),
          skipDuplicates: true,
        });
      return { categoryId, hiddenByCompanyIds: [...companyIds].sort() };
    });
  }

  replaceDishHiding(dishId: string, companyIds: string[]) {
    return this.prisma.$transaction(async (tx) => {
      const dish = await tx.dish.findUnique({
        where: { id: dishId },
        select: { id: true },
      });
      if (!dish) throw new NotFoundException('Dish not found.');
      await this.assertCompaniesExist(tx, companyIds);
      await tx.companyHiddenDish.deleteMany({
        where: { dishId, companyId: { notIn: companyIds } },
      });
      if (companyIds.length)
        await tx.companyHiddenDish.createMany({
          data: companyIds.map((companyId) => ({ companyId, dishId })),
          skipDuplicates: true,
        });
      return { dishId, hiddenByCompanyIds: [...companyIds].sort() };
    });
  }

  private async assertCompaniesExist(
    tx: Prisma.TransactionClient,
    companyIds: string[],
  ) {
    if (companyIds.length === 0) return;
    const found = await tx.company.findMany({
      where: { id: { in: companyIds } },
      select: { id: true },
    });
    const known = new Set(found.map((c) => c.id));
    const unknown = companyIds.filter((id) => !known.has(id));
    if (unknown.length)
      throw new BadRequestException(
        `Unknown company IDs: ${unknown.join(', ')}.`,
      );
  }
}
