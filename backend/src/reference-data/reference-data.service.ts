import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { rethrowKnownPrismaError } from '../common/prisma-errors.js';
import {
  PaginationQueryDto,
  pageArgs,
  paginate,
} from '../common/dto/pagination-query.dto.js';
import type {
  CreateNamedReferenceDto,
  CreateOrderedReferenceDto,
  UpdateNamedReferenceDto,
  UpdateOrderedReferenceDto,
} from './dto/reference-data.dto.js';

type ReferenceKind =
  | 'allergen'
  | 'dietaryTag'
  | 'kitchenStation'
  | 'portionSize'
  | 'packagingType';

@Injectable()
export class ReferenceDataService {
  constructor(private readonly prisma: PrismaService) {}

  /** Paginated management list; stable order (name, or displayOrder then name), id as tie-breaker. */
  async list(kind: ReferenceKind, query: PaginationQueryDto) {
    const where = query.search
      ? {
          name: { contains: query.search.trim(), mode: 'insensitive' as const },
        }
      : {};
    const byName = [{ name: 'asc' as const }, { id: 'asc' as const }];
    const byOrder = [{ displayOrder: 'asc' as const }, ...byName];
    const page = pageArgs(query);
    const [data, totalItems] = await (async (): Promise<
      [unknown[], number]
    > => {
      switch (kind) {
        case 'allergen':
          return this.prisma.$transaction([
            this.prisma.allergen.findMany({ where, orderBy: byName, ...page }),
            this.prisma.allergen.count({ where }),
          ]);
        case 'dietaryTag':
          return this.prisma.$transaction([
            this.prisma.dietaryTag.findMany({
              where,
              orderBy: byName,
              ...page,
            }),
            this.prisma.dietaryTag.count({ where }),
          ]);
        case 'kitchenStation':
          return this.prisma.$transaction([
            this.prisma.kitchenStation.findMany({
              where,
              orderBy: byOrder,
              ...page,
            }),
            this.prisma.kitchenStation.count({ where }),
          ]);
        case 'portionSize':
          return this.prisma.$transaction([
            this.prisma.portionSize.findMany({
              where,
              orderBy: byOrder,
              ...page,
            }),
            this.prisma.portionSize.count({ where }),
          ]);
        case 'packagingType':
          return this.prisma.$transaction([
            this.prisma.packagingType.findMany({
              where,
              orderBy: byOrder,
              ...page,
            }),
            this.prisma.packagingType.count({ where }),
          ]);
      }
    })();
    return paginate(data, totalItems, query.page, query.pageSize);
  }

  async create(
    kind: ReferenceKind,
    dto: CreateNamedReferenceDto | CreateOrderedReferenceDto,
  ) {
    const data = this.normalize(dto);
    await this.assertNameAvailable(kind, data.name);
    try {
      switch (kind) {
        case 'allergen':
          return await this.prisma.allergen.create({ data });
        case 'dietaryTag':
          return await this.prisma.dietaryTag.create({ data });
        case 'kitchenStation':
          return await this.prisma.kitchenStation.create({
            data: { ...data, displayOrder: this.requireDisplayOrder(dto) },
          });
        case 'portionSize':
          return await this.prisma.portionSize.create({
            data: { ...data, displayOrder: this.requireDisplayOrder(dto) },
          });
        case 'packagingType':
          return await this.prisma.packagingType.create({
            data: { ...data, displayOrder: this.requireDisplayOrder(dto) },
          });
      }
    } catch (error) {
      rethrowKnownPrismaError(error);
    }
  }

  async update(
    kind: ReferenceKind,
    id: string,
    dto: UpdateNamedReferenceDto | UpdateOrderedReferenceDto,
  ) {
    const name = dto.name?.trim();
    if (name !== undefined) {
      if (!name) throw new ConflictException('Name cannot be empty.');
      await this.assertNameAvailable(kind, name, id);
    }
    // Explicit whitelist of updatable fields (no DTO instance spread / mass assignment).
    const data = {
      ...(name === undefined ? {} : { name }),
      ...(dto.isActive === undefined ? {} : { isActive: dto.isActive }),
      ...('displayOrder' in dto && dto.displayOrder !== undefined
        ? { displayOrder: dto.displayOrder }
        : {}),
    };
    try {
      switch (kind) {
        case 'allergen':
          return await this.prisma.allergen.update({ where: { id }, data });
        case 'dietaryTag':
          return await this.prisma.dietaryTag.update({ where: { id }, data });
        case 'kitchenStation':
          return await this.prisma.kitchenStation.update({
            where: { id },
            data,
          });
        case 'portionSize':
          return await this.prisma.portionSize.update({ where: { id }, data });
        case 'packagingType':
          return await this.prisma.packagingType.update({
            where: { id },
            data,
          });
      }
    } catch (error) {
      if (this.isMissing(error))
        throw new NotFoundException('Reference record not found.');
      rethrowKnownPrismaError(error);
    }
  }

  private normalize(dto: CreateNamedReferenceDto) {
    const name = dto.name.trim();
    if (!name) throw new ConflictException('Name cannot be empty.');
    return { name, isActive: dto.isActive ?? true };
  }

  private requireDisplayOrder(dto: CreateNamedReferenceDto): number {
    if (!('displayOrder' in dto) || typeof dto.displayOrder !== 'number') {
      throw new ConflictException('displayOrder is required.');
    }
    return dto.displayOrder;
  }

  private async assertNameAvailable(
    kind: ReferenceKind,
    name: string,
    excludeId?: string,
  ) {
    const where = {
      name: { equals: name, mode: 'insensitive' as const },
      id: excludeId ? { not: excludeId } : undefined,
    };
    let existing: { id: string } | null;
    switch (kind) {
      case 'allergen':
        existing = await this.prisma.allergen.findFirst({
          where,
          select: { id: true },
        });
        break;
      case 'dietaryTag':
        existing = await this.prisma.dietaryTag.findFirst({
          where,
          select: { id: true },
        });
        break;
      case 'kitchenStation':
        existing = await this.prisma.kitchenStation.findFirst({
          where,
          select: { id: true },
        });
        break;
      case 'portionSize':
        existing = await this.prisma.portionSize.findFirst({
          where,
          select: { id: true },
        });
        break;
      case 'packagingType':
        existing = await this.prisma.packagingType.findFirst({
          where,
          select: { id: true },
        });
        break;
    }
    if (existing)
      throw new ConflictException(
        'A reference record with this name already exists.',
      );
  }

  private isMissing(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'P2025'
    );
  }
}
