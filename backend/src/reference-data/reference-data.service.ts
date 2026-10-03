import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { rethrowKnownPrismaError } from '../common/prisma-errors.js';
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

  list(kind: ReferenceKind) {
    switch (kind) {
      case 'allergen':
        return this.prisma.allergen.findMany({ orderBy: { name: 'asc' } });
      case 'dietaryTag':
        return this.prisma.dietaryTag.findMany({ orderBy: { name: 'asc' } });
      case 'kitchenStation':
        return this.prisma.kitchenStation.findMany({
          orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
        });
      case 'portionSize':
        return this.prisma.portionSize.findMany({
          orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
        });
      case 'packagingType':
        return this.prisma.packagingType.findMany({
          orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
        });
    }
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
    const data = { ...dto, ...(name === undefined ? {} : { name }) };
    try {
      switch (kind) {
        case 'allergen':
          return await this.prisma.allergen.update({ where: { id }, data });
        case 'dietaryTag':
          return await this.prisma.dietaryTag.update({ where: { id }, data });
        case 'kitchenStation':
          return await this.prisma.kitchenStation.update({ where: { id }, data });
        case 'portionSize':
          return await this.prisma.portionSize.update({ where: { id }, data });
        case 'packagingType':
          return await this.prisma.packagingType.update({ where: { id }, data });
      }
    } catch (error) {
      if (this.isMissing(error)) throw new NotFoundException('Reference record not found.');
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

  private async assertNameAvailable(kind: ReferenceKind, name: string, excludeId?: string) {
    const where = { name: { equals: name, mode: 'insensitive' as const }, id: excludeId ? { not: excludeId } : undefined };
    let existing: { id: string } | null;
    switch (kind) {
      case 'allergen': existing = await this.prisma.allergen.findFirst({ where, select: { id: true } }); break;
      case 'dietaryTag': existing = await this.prisma.dietaryTag.findFirst({ where, select: { id: true } }); break;
      case 'kitchenStation': existing = await this.prisma.kitchenStation.findFirst({ where, select: { id: true } }); break;
      case 'portionSize': existing = await this.prisma.portionSize.findFirst({ where, select: { id: true } }); break;
      case 'packagingType': existing = await this.prisma.packagingType.findFirst({ where, select: { id: true } }); break;
    }
    if (existing) throw new ConflictException('A reference record with this name already exists.');
  }

  private isMissing(error: unknown): boolean {
    return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2025';
  }
}
