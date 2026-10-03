import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, type PrismaClient } from '../generated/prisma/client.js';
import { paginate } from '../common/dto/pagination-query.dto.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CreateEmployeeDto, EmployeeQueryDto, UpdateEmployeeDto } from './dto/employee.dto.js';

type DbClient = Prisma.TransactionClient | PrismaClient;
const employeeInclude = {
  company: { select: { id: true, name: true } }, defaultDeliveryAddress: true,
  allergens: { include: { allergen: true } }, dietaryTags: { include: { dietaryTag: true } },
  ownedCompany: { select: { id: true, name: true } },
} satisfies Prisma.EmployeeInclude;

@Injectable()
export class EmployeesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: EmployeeQueryDto) {
    const search = query.search?.trim();
    const where: Prisma.EmployeeWhereInput = {
      companyId: query.companyId,
      ...(search ? { OR: [{ name: { contains: search, mode: 'insensitive' } }, { email: { contains: search, mode: 'insensitive' } }] } : {}),
    };
    const [data, total] = await Promise.all([
      this.prisma.employee.findMany({ where, orderBy: [{ company: { name: 'asc' } }, { name: 'asc' }], skip: (query.page - 1) * query.pageSize, take: query.pageSize, include: { company: { select: { id: true, name: true } }, defaultDeliveryAddress: { select: { id: true, label: true } }, allergens: { include: { allergen: true } }, dietaryTags: { include: { dietaryTag: true } }, _count: { select: { orders: true } } } }),
      this.prisma.employee.count({ where }),
    ]);
    return paginate(data, total, query.page, query.pageSize);
  }

  listForCompany(companyId: string, query: EmployeeQueryDto) {
    return this.list(Object.assign(query, { companyId }));
  }

  async get(id: string) {
    const employee = await this.prisma.employee.findUnique({ where: { id }, include: employeeInclude });
    if (!employee) throw new NotFoundException('Employee not found.');
    return employee;
  }

  async create(companyId: string, dto: CreateEmployeeDto) {
    return this.prisma.$transaction(async (tx) => {
      if (!(await tx.company.findUnique({ where: { id: companyId }, select: { id: true } }))) throw new NotFoundException('Company not found.');
      await this.validateRelations(tx, companyId, dto);
      return tx.employee.create({ data: {
        companyId, name: dto.name.trim(), email: dto.email?.trim().toLowerCase() || null,
        defaultDeliveryAddressId: dto.defaultDeliveryAddressId ?? null,
        canChooseDeliveryAddress: dto.canChooseDeliveryAddress, canChangeDeliveryTime: dto.canChangeDeliveryTime,
        canChangePackaging: dto.canChangePackaging,
        allergens: { create: dto.allergenIds.map((allergenId) => ({ allergenId })) },
        dietaryTags: { create: dto.dietaryTagIds.map((dietaryTagId) => ({ dietaryTagId })) },
      }, include: employeeInclude });
    });
  }

  async update(id: string, dto: UpdateEmployeeDto) {
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.employee.findUnique({ where: { id }, include: { ownedCompany: { select: { id: true } } } });
      if (!current) throw new NotFoundException('Employee not found.');
      const companyId = dto.companyId ?? current.companyId;
      if (current.ownedCompany && companyId !== current.companyId) throw new ConflictException('Reassign the company owner before moving this employee.');
      if (companyId !== current.companyId && !(await tx.company.findUnique({ where: { id: companyId }, select: { id: true } }))) throw new BadRequestException('Target company is invalid.');
      const effectiveAddressId = dto.defaultDeliveryAddressId === undefined ? current.defaultDeliveryAddressId : dto.defaultDeliveryAddressId;
      await this.validateRelations(tx, companyId, { allergenIds: dto.allergenIds ?? [], dietaryTagIds: dto.dietaryTagIds ?? [], defaultDeliveryAddressId: effectiveAddressId }, dto.allergenIds === undefined, dto.dietaryTagIds === undefined);
      await tx.employee.update({ where: { id }, data: {
        ...(dto.companyId === undefined ? {} : { companyId }),
        ...(dto.name === undefined ? {} : { name: dto.name.trim() }),
        ...(dto.email === undefined ? {} : { email: dto.email?.trim().toLowerCase() || null }),
        ...(dto.defaultDeliveryAddressId === undefined ? {} : { defaultDeliveryAddressId: dto.defaultDeliveryAddressId }),
        ...(dto.canChooseDeliveryAddress === undefined ? {} : { canChooseDeliveryAddress: dto.canChooseDeliveryAddress }),
        ...(dto.canChangeDeliveryTime === undefined ? {} : { canChangeDeliveryTime: dto.canChangeDeliveryTime }),
        ...(dto.canChangePackaging === undefined ? {} : { canChangePackaging: dto.canChangePackaging }),
      } });
      if (dto.allergenIds) {
        await tx.employeeAllergen.deleteMany({ where: { employeeId: id } });
        if (dto.allergenIds.length) await tx.employeeAllergen.createMany({ data: dto.allergenIds.map((allergenId) => ({ employeeId: id, allergenId })) });
      }
      if (dto.dietaryTagIds) {
        await tx.employeeDietaryTag.deleteMany({ where: { employeeId: id } });
        if (dto.dietaryTagIds.length) await tx.employeeDietaryTag.createMany({ data: dto.dietaryTagIds.map((dietaryTagId) => ({ employeeId: id, dietaryTagId })) });
      }
      return tx.employee.findUniqueOrThrow({ where: { id }, include: employeeInclude });
    });
  }

  private async validateRelations(db: DbClient, companyId: string, dto: Pick<CreateEmployeeDto, 'allergenIds' | 'dietaryTagIds' | 'defaultDeliveryAddressId'>, skipAllergens = false, skipTags = false) {
    if (dto.defaultDeliveryAddressId && !(await db.companyAddress.findFirst({ where: { id: dto.defaultDeliveryAddressId, companyId, isActive: true }, select: { id: true } }))) throw new BadRequestException('Default delivery address must be an active address of the employee company.');
    const [allergens, tags] = await Promise.all([
      skipAllergens ? dto.allergenIds.length : db.allergen.count({ where: { id: { in: dto.allergenIds }, isActive: true } }),
      skipTags ? dto.dietaryTagIds.length : db.dietaryTag.count({ where: { id: { in: dto.dietaryTagIds }, isActive: true } }),
    ]);
    if (allergens !== dto.allergenIds.length) throw new BadRequestException('One or more allergens are invalid or inactive.');
    if (tags !== dto.dietaryTagIds.length) throw new BadRequestException('One or more dietary tags are invalid or inactive.');
  }
}
