import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, type PrismaClient } from '../generated/prisma/client.js';
import { paginate } from '../common/dto/pagination-query.dto.js';
import { rethrowKnownPrismaError } from '../common/prisma-errors.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CreateDishDto, CreateOptionDto, DishQueryDto, OptionGroupInputDto, UpdateDishDto, UpdateOptionDto } from './dto/catalogue.dto.js';

type DbClient = Prisma.TransactionClient | PrismaClient;

const dishInclude = {
  station: true,
  allergens: { include: { allergen: true } },
  dietaryTags: { include: { dietaryTag: true } },
  optionGroups: {
    orderBy: { displayOrder: 'asc' as const },
    include: {
      options: { orderBy: { displayOrder: 'asc' as const }, include: { option: true } },
      portions: { orderBy: { displayOrder: 'asc' as const }, include: { portionSize: true } },
    },
  },
} satisfies Prisma.DishInclude;

@Injectable()
export class CatalogueService {
  constructor(private readonly prisma: PrismaService) {}

  async listDishes(query: DishQueryDto) {
    const search = query.search?.trim();
    const where: Prisma.DishWhereInput = {
      isActive: query.isActive,
      temperature: query.temperature,
      stationId: query.stationId,
      ...(search ? { OR: [{ name: { contains: search, mode: 'insensitive' } }, { sku: { contains: search, mode: 'insensitive' } }] } : {}),
    };
    const [data, total] = await Promise.all([
      this.prisma.dish.findMany({
        where,
        include: { station: true, allergens: { include: { allergen: true } }, dietaryTags: { include: { dietaryTag: true } } },
        orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.dish.count({ where }),
    ]);
    return paginate(data, total, query.page, query.pageSize);
  }

  async getDish(id: string) {
    const dish = await this.prisma.dish.findUnique({ where: { id }, include: dishInclude });
    if (!dish) throw new NotFoundException('Dish not found.');
    return dish;
  }

  async createDish(dto: CreateDishDto) {
    return this.prisma.$transaction(async (tx) => {
      await this.validateDishRelations(tx, dto);
      this.validateGroups(dto.optionGroups);
      try {
        const dish = await tx.dish.create({
          data: {
            name: dto.name.trim(), description: dto.description.trim(), imageUrl: dto.imageUrl.trim(), sku: dto.sku.trim().toUpperCase(),
            temperature: dto.temperature, costCents: dto.costCents, minimumOrderQuantity: dto.minimumOrderQuantity ?? null,
            stationId: dto.stationId ?? null, isActive: dto.isActive ?? true,
            allergens: { createMany: { data: dto.allergenIds.map((allergenId) => ({ allergenId })) } },
            dietaryTags: { createMany: { data: dto.dietaryTagIds.map((dietaryTagId) => ({ dietaryTagId })) } },
          },
        });
        await this.syncGroups(tx, dish.id, dto.optionGroups);
        return tx.dish.findUniqueOrThrow({ where: { id: dish.id }, include: dishInclude });
      } catch (error) {
        rethrowKnownPrismaError(error);
      }
    });
  }

  async updateDish(id: string, dto: UpdateDishDto) {
    return this.prisma.$transaction(async (tx) => {
      if (!(await tx.dish.findUnique({ where: { id }, select: { id: true } }))) throw new NotFoundException('Dish not found.');
      await this.validateDishRelations(tx, dto);
      if (dto.optionGroups) this.validateGroups(dto.optionGroups);
      const data: Prisma.DishUpdateInput = {
        ...(dto.name === undefined ? {} : { name: dto.name.trim() }),
        ...(dto.description === undefined ? {} : { description: dto.description.trim() }),
        ...(dto.imageUrl === undefined ? {} : { imageUrl: dto.imageUrl.trim() }),
        ...(dto.sku === undefined ? {} : { sku: dto.sku.trim().toUpperCase() }),
        ...(dto.temperature === undefined ? {} : { temperature: dto.temperature }),
        ...(dto.costCents === undefined ? {} : { costCents: dto.costCents }),
        ...(dto.minimumOrderQuantity === undefined ? {} : { minimumOrderQuantity: dto.minimumOrderQuantity }),
        ...(dto.stationId === undefined ? {} : { station: dto.stationId === null ? { disconnect: true } : { connect: { id: dto.stationId } } }),
        ...(dto.isActive === undefined ? {} : { isActive: dto.isActive }),
      };
      try {
        await tx.dish.update({ where: { id }, data });
        if (dto.allergenIds) {
          await tx.dishAllergen.deleteMany({ where: { dishId: id } });
          await tx.dishAllergen.createMany({ data: dto.allergenIds.map((allergenId) => ({ dishId: id, allergenId })) });
        }
        if (dto.dietaryTagIds) {
          await tx.dishDietaryTag.deleteMany({ where: { dishId: id } });
          await tx.dishDietaryTag.createMany({ data: dto.dietaryTagIds.map((dietaryTagId) => ({ dishId: id, dietaryTagId })) });
        }
        if (dto.optionGroups) await this.syncGroups(tx, id, dto.optionGroups);
        return tx.dish.findUniqueOrThrow({ where: { id }, include: dishInclude });
      } catch (error) {
        rethrowKnownPrismaError(error);
      }
    });
  }

  async deactivateDish(id: string) {
    try {
      return await this.prisma.dish.update({ where: { id }, data: { isActive: false } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') throw new NotFoundException('Dish not found.');
      throw error;
    }
  }

  listOptions() {
    return this.prisma.option.findMany({
      include: { allergens: { include: { allergen: true } }, dietaryTags: { include: { dietaryTag: true } } },
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
    });
  }

  async getOption(id: string) {
    const option = await this.prisma.option.findUnique({ where: { id }, include: { allergens: { include: { allergen: true } }, dietaryTags: { include: { dietaryTag: true } }, optionGroups: true } });
    if (!option) throw new NotFoundException('Option not found.');
    return option;
  }

  async createOption(dto: CreateOptionDto) {
    await this.validateOptionRelations(this.prisma, dto);
    await this.assertOptionNameAvailable(dto.name);
    return this.prisma.option.create({ data: {
      name: dto.name.trim(), costCents: dto.costCents, isActive: dto.isActive ?? true,
      allergens: { createMany: { data: dto.allergenIds.map((allergenId) => ({ allergenId })) } },
      dietaryTags: { createMany: { data: dto.dietaryTagIds.map((dietaryTagId) => ({ dietaryTagId })) } },
    }, include: { allergens: { include: { allergen: true } }, dietaryTags: { include: { dietaryTag: true } } } });
  }

  async updateOption(id: string, dto: UpdateOptionDto) {
    return this.prisma.$transaction(async (tx) => {
      if (!(await tx.option.findUnique({ where: { id }, select: { id: true } }))) throw new NotFoundException('Option not found.');
      await this.validateOptionRelations(tx, dto);
      if (dto.name) await this.assertOptionNameAvailable(dto.name, id, tx);
      await tx.option.update({ where: { id }, data: {
        ...(dto.name === undefined ? {} : { name: dto.name.trim() }),
        ...(dto.costCents === undefined ? {} : { costCents: dto.costCents }),
        ...(dto.isActive === undefined ? {} : { isActive: dto.isActive }),
      } });
      if (dto.allergenIds) {
        await tx.optionAllergen.deleteMany({ where: { optionId: id } });
        await tx.optionAllergen.createMany({ data: dto.allergenIds.map((allergenId) => ({ optionId: id, allergenId })) });
      }
      if (dto.dietaryTagIds) {
        await tx.optionDietaryTag.deleteMany({ where: { optionId: id } });
        await tx.optionDietaryTag.createMany({ data: dto.dietaryTagIds.map((dietaryTagId) => ({ optionId: id, dietaryTagId })) });
      }
      return tx.option.findUniqueOrThrow({ where: { id }, include: { allergens: { include: { allergen: true } }, dietaryTags: { include: { dietaryTag: true } } } });
    });
  }

  private async validateDishRelations(db: DbClient, dto: { stationId?: string | null; allergenIds?: string[]; dietaryTagIds?: string[]; optionGroups?: OptionGroupInputDto[] }) {
    const optionGroups = dto.optionGroups ?? [];
    const optionIds = [...new Set(optionGroups.flatMap((group) => group.options.map((option) => option.optionId)))];
    const portionIds = [...new Set(optionGroups.flatMap((group) => group.portions.map((portion) => portion.portionSizeId)))];
    const [stations, allergens, tags, options, portions] = await Promise.all([
      dto.stationId ? db.kitchenStation.count({ where: { id: dto.stationId, isActive: true } }) : 1,
      db.allergen.count({ where: { id: { in: dto.allergenIds ?? [] }, isActive: true } }),
      db.dietaryTag.count({ where: { id: { in: dto.dietaryTagIds ?? [] }, isActive: true } }),
      db.option.count({ where: { id: { in: optionIds }, isActive: true } }),
      db.portionSize.count({ where: { id: { in: portionIds }, isActive: true } }),
    ]);
    if (!stations) throw new BadRequestException('Kitchen station is invalid or inactive.');
    if (allergens !== (dto.allergenIds?.length ?? 0)) throw new BadRequestException('One or more allergens are invalid or inactive.');
    if (tags !== (dto.dietaryTagIds?.length ?? 0)) throw new BadRequestException('One or more dietary tags are invalid or inactive.');
    if (options !== optionIds.length) throw new BadRequestException('One or more options are invalid or inactive.');
    if (portions !== portionIds.length) throw new BadRequestException('One or more portion sizes are invalid or inactive.');
  }

  private async validateOptionRelations(db: DbClient, dto: { allergenIds?: string[]; dietaryTagIds?: string[] }) {
    const [allergens, tags] = await Promise.all([
      db.allergen.count({ where: { id: { in: dto.allergenIds ?? [] }, isActive: true } }),
      db.dietaryTag.count({ where: { id: { in: dto.dietaryTagIds ?? [] }, isActive: true } }),
    ]);
    if (allergens !== (dto.allergenIds?.length ?? 0)) throw new BadRequestException('One or more allergens are invalid or inactive.');
    if (tags !== (dto.dietaryTagIds?.length ?? 0)) throw new BadRequestException('One or more dietary tags are invalid or inactive.');
  }

  private validateGroups(groups: OptionGroupInputDto[]) {
    const names = groups.map((group) => group.name.trim().toLowerCase());
    if (new Set(names).size !== names.length) throw new BadRequestException('Option group names must be unique within a dish.');
    for (const group of groups) {
      if (!group.name.trim()) throw new BadRequestException('Option group name cannot be empty.');
      if (new Set(group.options.map((value) => value.optionId)).size !== group.options.length) throw new BadRequestException('An option cannot appear twice in a group.');
      if (new Set(group.portions.map((value) => value.portionSizeId)).size !== group.portions.length) throw new BadRequestException('A portion cannot appear twice in a group.');
      if (group.usesPortions && group.portions.length === 0) throw new BadRequestException('Portion-enabled groups require at least one portion size.');
      if (!group.usesPortions && group.portions.length > 0) throw new BadRequestException('Groups without portions cannot define portion charges.');
    }
  }

  private async syncGroups(tx: Prisma.TransactionClient, dishId: string, groups: OptionGroupInputDto[]) {
    const existing = await tx.optionGroup.findMany({ where: { dishId }, select: { id: true } });
    const existingIds = new Set(existing.map(({ id }) => id));
    const suppliedIds = new Set(groups.flatMap((group) => group.id ? [group.id] : []));
    if ([...suppliedIds].some((id) => !existingIds.has(id))) throw new BadRequestException('An option group does not belong to this dish.');
    const removedIds = existing.map(({ id }) => id).filter((id) => !suppliedIds.has(id));
    if (removedIds.length) {
      const historical = await tx.orderCombinationOption.count({ where: { optionGroupId: { in: removedIds } } });
      if (historical) throw new ConflictException('A historically referenced option group cannot be removed.');
      await tx.optionGroup.deleteMany({ where: { id: { in: removedIds }, dishId } });
    }
    for (const group of groups) {
      const groupId = group.id ?? (await tx.optionGroup.create({ data: { dishId, name: group.name.trim(), isRequired: group.isRequired, usesPortions: group.usesPortions, displayOrder: group.displayOrder }, select: { id: true } })).id;
      if (group.id) await tx.optionGroup.update({ where: { id: groupId }, data: { name: group.name.trim(), isRequired: group.isRequired, usesPortions: group.usesPortions, displayOrder: group.displayOrder } });
      await tx.optionGroupOption.deleteMany({ where: { optionGroupId: groupId } });
      await tx.optionGroupPortion.deleteMany({ where: { optionGroupId: groupId } });
      if (group.options.length) await tx.optionGroupOption.createMany({ data: group.options.map((value) => ({ optionGroupId: groupId, ...value })) });
      if (group.portions.length) await tx.optionGroupPortion.createMany({ data: group.portions.map((value) => ({ optionGroupId: groupId, ...value })) });
    }
  }

  private async assertOptionNameAvailable(name: string, excludeId?: string, db: DbClient = this.prisma) {
    const existing = await db.option.findFirst({ where: { name: { equals: name.trim(), mode: 'insensitive' }, id: excludeId ? { not: excludeId } : undefined }, select: { id: true } });
    if (existing) throw new ConflictException('An option with this name already exists.');
  }
}
