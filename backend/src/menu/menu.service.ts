import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CreateMenuCategoryDto, ReplaceMenuItemsDto, UpdateMenuCategoryDto } from './dto/menu.dto.js';

const menuInclude = {
  items: { orderBy: { displayOrder: 'asc' as const }, include: { dish: { select: { id: true, name: true, sku: true, isActive: true } } } },
} satisfies Prisma.MenuCategoryInclude;

@Injectable()
export class MenuService {
  constructor(private readonly prisma: PrismaService) {}

  listCategories() {
    return this.prisma.menuCategory.findMany({ include: { _count: { select: { items: true } } }, orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }] });
  }

  async getCategory(id: string) {
    const category = await this.prisma.menuCategory.findUnique({ where: { id }, include: menuInclude });
    if (!category) throw new NotFoundException('Menu category not found.');
    return category;
  }

  async createCategory(dto: CreateMenuCategoryDto) {
    try {
      return await this.prisma.menuCategory.create({ data: { name: dto.name.trim(), slug: dto.slug.trim().toLowerCase(), displayOrder: dto.displayOrder, isActive: dto.isActive ?? true, isSecret: dto.isSecret ?? false } });
    } catch (error) {
      this.rethrow(error);
    }
  }

  async updateCategory(id: string, dto: UpdateMenuCategoryDto) {
    try {
      return await this.prisma.menuCategory.update({ where: { id }, data: {
        ...(dto.name === undefined ? {} : { name: dto.name.trim() }),
        ...(dto.slug === undefined ? {} : { slug: dto.slug.trim().toLowerCase() }),
        ...(dto.displayOrder === undefined ? {} : { displayOrder: dto.displayOrder }),
        ...(dto.isActive === undefined ? {} : { isActive: dto.isActive }),
        ...(dto.isSecret === undefined ? {} : { isSecret: dto.isSecret }),
      } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') throw new NotFoundException('Menu category not found.');
      this.rethrow(error);
    }
  }

  async replaceItems(categoryId: string, dto: ReplaceMenuItemsDto) {
    return this.prisma.$transaction(async (tx) => {
      if (!(await tx.menuCategory.findUnique({ where: { id: categoryId }, select: { id: true } }))) throw new NotFoundException('Menu category not found.');
      const dishIds = dto.items.map(({ dishId }) => dishId);
      if ((await tx.dish.count({ where: { id: { in: dishIds } } })) !== dishIds.length) throw new BadRequestException('One or more dishes are invalid.');
      await tx.menuCategoryItem.deleteMany({ where: { categoryId } });
      if (dto.items.length) await tx.menuCategoryItem.createMany({ data: dto.items.map((item) => ({ categoryId, ...item })) });
      return tx.menuCategory.findUniqueOrThrow({ where: { id: categoryId }, include: menuInclude });
    });
  }

  private rethrow(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new ConflictException('A menu category with this slug already exists.');
    throw error;
  }
}
