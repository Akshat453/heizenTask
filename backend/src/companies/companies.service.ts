import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, type PrismaClient } from '../generated/prisma/client.js';
import { paginate } from '../common/dto/pagination-query.dto.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type {
  CompanyAddressInputDto,
  CompanyQueryDto,
  CreateCompanyDto,
  OwnerEmployeeInputDto,
  UpdateCompanyDto,
} from './dto/company.dto.js';
import { dateOnly, normalizeCompanyDomain, timeOnly } from './domain.js';

type DbClient = Prisma.TransactionClient | PrismaClient;

const companyInclude = {
  ownerEmployee: { select: { id: true, name: true, email: true } },
  priceTier: true,
  defaultPackagingType: true,
  defaultDriver: { select: { id: true, name: true, email: true } },
  domains: { orderBy: { domain: 'asc' as const } },
  addresses: {
    orderBy: [{ isActive: 'desc' as const }, { label: 'asc' as const }],
  },
  workingDays: true,
  holidays: { orderBy: { date: 'asc' as const } },
  hiddenCategories: { include: { category: true } },
  hiddenDishes: {
    include: { dish: { select: { id: true, name: true, sku: true } } },
  },
} satisfies Prisma.CompanyInclude;

@Injectable()
export class CompaniesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: CompanyQueryDto) {
    const search = query.search?.trim();
    const where: Prisma.CompanyWhereInput = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            {
              domains: {
                some: { domain: { contains: search, mode: 'insensitive' } },
              },
            },
          ],
        }
      : {};
    const [data, total] = await Promise.all([
      this.prisma.company.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: {
          ownerEmployee: { select: { id: true, name: true } },
          priceTier: { select: { id: true, name: true } },
          domains: { select: { domain: true }, orderBy: { domain: 'asc' } },
          _count: { select: { employees: true, addresses: true } },
        },
      }),
      this.prisma.company.count({ where }),
    ]);
    return paginate(data, total, query.page, query.pageSize);
  }

  async get(id: string) {
    const company = await this.prisma.company.findUnique({
      where: { id },
      include: companyInclude,
    });
    if (!company) throw new NotFoundException('Company not found.');
    return company;
  }

  async create(dto: CreateCompanyDto) {
    const domains = this.normalizeDomains(dto.domains);
    this.validateHolidays(dto.holidays);
    return this.prisma
      .$transaction(async (tx) => {
        await this.validateDefaults(tx, dto);
        await this.assertDomainsAvailable(tx, domains);
        await this.validateEmployeePreferences(tx, dto.owner);
        const company = await tx.company.create({
          data: {
            name: dto.name.trim(),
            billingContactName: dto.billingContactName.trim(),
            billingContactEmail: dto.billingContactEmail.trim().toLowerCase(),
            billingContactPhone: dto.billingContactPhone?.trim() || null,
            priceTierId: dto.priceTierId ?? null,
            defaultDeliveryTime: timeOnly(dto.defaultDeliveryTime),
            deliveryLeadMinutes: dto.deliveryLeadMinutes,
            defaultPackagingTypeId: dto.defaultPackagingTypeId,
            driverInstructions: dto.driverInstructions?.trim() || null,
            defaultDriverStaffUserId: dto.defaultDriverStaffUserId ?? null,
            domains: { create: domains.map((domain) => ({ domain })) },
            addresses: {
              create: dto.addresses.map((address) => this.addressData(address)),
            },
            workingDays: {
              create: dto.workingDays.map((dayOfWeek) => ({ dayOfWeek })),
            },
            holidays: {
              create: dto.holidays.map((holiday) => ({
                date: dateOnly(holiday.date),
                name: holiday.name?.trim() || null,
              })),
            },
            hiddenCategories: {
              create: dto.hiddenCategoryIds.map((categoryId) => ({
                categoryId,
              })),
            },
            hiddenDishes: {
              create: dto.hiddenDishIds.map((dishId) => ({ dishId })),
            },
          },
        });
        const owner = await tx.employee.create({
          data: {
            companyId: company.id,
            name: dto.owner.name.trim(),
            email: dto.owner.email?.trim().toLowerCase() || null,
            canChooseDeliveryAddress:
              dto.owner.canChooseDeliveryAddress ?? false,
            canChangeDeliveryTime: dto.owner.canChangeDeliveryTime ?? false,
            canChangePackaging: dto.owner.canChangePackaging ?? false,
            allergens: {
              create: dto.owner.allergenIds.map((allergenId) => ({
                allergenId,
              })),
            },
            dietaryTags: {
              create: dto.owner.dietaryTagIds.map((dietaryTagId) => ({
                dietaryTagId,
              })),
            },
          },
        });
        await tx.company.update({
          where: { id: company.id },
          data: { ownerEmployeeId: owner.id },
        });
        return tx.company.findUniqueOrThrow({
          where: { id: company.id },
          include: companyInclude,
        });
      })
      .catch((error: unknown) => this.rethrow(error));
  }

  async update(id: string, dto: UpdateCompanyDto) {
    if (dto.holidays) this.validateHolidays(dto.holidays);
    const domains = dto.domains
      ? this.normalizeDomains(dto.domains)
      : undefined;
    return this.prisma
      .$transaction(async (tx) => {
        if (
          !(await tx.company.findUnique({
            where: { id },
            select: { id: true },
          }))
        )
          throw new NotFoundException('Company not found.');
        await this.validateDefaults(tx, dto);
        if (domains) await this.assertDomainsAvailable(tx, domains, id);
        if (dto.ownerEmployeeId)
          await this.assertOwner(tx, id, dto.ownerEmployeeId);
        await tx.company.update({
          where: { id },
          data: {
            ...(dto.name === undefined ? {} : { name: dto.name.trim() }),
            ...(dto.billingContactName === undefined
              ? {}
              : { billingContactName: dto.billingContactName.trim() }),
            ...(dto.billingContactEmail === undefined
              ? {}
              : {
                  billingContactEmail: dto.billingContactEmail
                    .trim()
                    .toLowerCase(),
                }),
            ...(dto.billingContactPhone === undefined
              ? {}
              : {
                  billingContactPhone: dto.billingContactPhone?.trim() || null,
                }),
            ...(dto.ownerEmployeeId === undefined
              ? {}
              : { ownerEmployeeId: dto.ownerEmployeeId }),
            ...(dto.priceTierId === undefined
              ? {}
              : { priceTierId: dto.priceTierId }),
            ...(dto.defaultDeliveryTime === undefined
              ? {}
              : { defaultDeliveryTime: timeOnly(dto.defaultDeliveryTime) }),
            ...(dto.deliveryLeadMinutes === undefined
              ? {}
              : { deliveryLeadMinutes: dto.deliveryLeadMinutes }),
            ...(dto.defaultPackagingTypeId === undefined
              ? {}
              : { defaultPackagingTypeId: dto.defaultPackagingTypeId }),
            ...(dto.driverInstructions === undefined
              ? {}
              : { driverInstructions: dto.driverInstructions?.trim() || null }),
            ...(dto.defaultDriverStaffUserId === undefined
              ? {}
              : { defaultDriverStaffUserId: dto.defaultDriverStaffUserId }),
          },
        });
        if (domains) await this.syncDomains(tx, id, domains);
        if (dto.addresses) await this.syncAddresses(tx, id, dto.addresses);
        if (dto.workingDays) {
          await tx.companyWorkingDay.deleteMany({ where: { companyId: id } });
          await tx.companyWorkingDay.createMany({
            data: dto.workingDays.map((dayOfWeek) => ({
              companyId: id,
              dayOfWeek,
            })),
          });
        }
        if (dto.holidays) {
          await tx.companyHoliday.deleteMany({ where: { companyId: id } });
          if (dto.holidays.length)
            await tx.companyHoliday.createMany({
              data: dto.holidays.map((holiday) => ({
                companyId: id,
                date: dateOnly(holiday.date),
                name: holiday.name?.trim() || null,
              })),
            });
        }
        if (dto.hiddenCategoryIds) {
          await tx.companyHiddenCategory.deleteMany({
            where: { companyId: id },
          });
          if (dto.hiddenCategoryIds.length)
            await tx.companyHiddenCategory.createMany({
              data: dto.hiddenCategoryIds.map((categoryId) => ({
                companyId: id,
                categoryId,
              })),
            });
        }
        if (dto.hiddenDishIds) {
          await tx.companyHiddenDish.deleteMany({ where: { companyId: id } });
          if (dto.hiddenDishIds.length)
            await tx.companyHiddenDish.createMany({
              data: dto.hiddenDishIds.map((dishId) => ({
                companyId: id,
                dishId,
              })),
            });
        }
        return tx.company.findUniqueOrThrow({
          where: { id },
          include: companyInclude,
        });
      })
      .catch((error: unknown) => this.rethrow(error));
  }

  private async validateDefaults(
    db: DbClient,
    dto:
      | Pick<
          CreateCompanyDto,
          | 'defaultPackagingTypeId'
          | 'priceTierId'
          | 'defaultDriverStaffUserId'
          | 'hiddenCategoryIds'
          | 'hiddenDishIds'
        >
      | UpdateCompanyDto,
  ) {
    if (
      dto.defaultPackagingTypeId &&
      !(await db.packagingType.findFirst({
        where: { id: dto.defaultPackagingTypeId, isActive: true },
        select: { id: true },
      }))
    )
      throw new BadRequestException(
        'Default packaging type is invalid or inactive.',
      );
    if (
      dto.priceTierId &&
      !(await db.priceTier.findFirst({
        where: { id: dto.priceTierId, isActive: true },
        select: { id: true },
      }))
    )
      throw new BadRequestException(
        'Company price tier is invalid or inactive.',
      );
    if (dto.defaultDriverStaffUserId) {
      const driver = await db.staffUser.findFirst({
        where: {
          id: dto.defaultDriverStaffUserId,
          isActive: true,
          role: {
            permissions: {
              some: { permission: { key: 'driver.own_drops.deliver' } },
            },
          },
        },
        select: { id: true },
      });
      if (!driver)
        throw new BadRequestException(
          'Default driver is inactive or lacks driver capability.',
        );
    }
    if (
      dto.hiddenCategoryIds &&
      (await db.menuCategory.count({
        where: { id: { in: dto.hiddenCategoryIds } },
      })) !== dto.hiddenCategoryIds.length
    )
      throw new BadRequestException(
        'One or more hidden categories are invalid.',
      );
    if (
      dto.hiddenDishIds &&
      (await db.dish.count({ where: { id: { in: dto.hiddenDishIds } } })) !==
        dto.hiddenDishIds.length
    )
      throw new BadRequestException('One or more hidden dishes are invalid.');
  }

  private async validateEmployeePreferences(
    db: DbClient,
    owner: OwnerEmployeeInputDto,
  ) {
    const [allergens, tags] = await Promise.all([
      db.allergen.count({
        where: { id: { in: owner.allergenIds }, isActive: true },
      }),
      db.dietaryTag.count({
        where: { id: { in: owner.dietaryTagIds }, isActive: true },
      }),
    ]);
    if (
      allergens !== owner.allergenIds.length ||
      tags !== owner.dietaryTagIds.length
    )
      throw new BadRequestException(
        'Owner preferences contain invalid references.',
      );
  }

  private async assertOwner(
    db: DbClient,
    companyId: string,
    employeeId: string,
  ) {
    if (
      !(await db.employee.findFirst({
        where: { id: employeeId, companyId },
        select: { id: true },
      }))
    )
      throw new BadRequestException(
        'Company owner must be an employee of that company.',
      );
  }

  private normalizeDomains(values: string[]) {
    const domains = values.map(normalizeCompanyDomain);
    if (new Set(domains).size !== domains.length)
      throw new BadRequestException('Company domains must be unique.');
    return domains;
  }

  private validateHolidays(values: { date: string }[]) {
    if (new Set(values.map(({ date }) => date)).size !== values.length)
      throw new BadRequestException(
        'A company cannot have duplicate holiday dates.',
      );
  }

  private async assertDomainsAvailable(
    db: DbClient,
    domains: string[],
    companyId?: string,
  ) {
    const conflict = await db.companyDomain.findFirst({
      where: {
        domain: { in: domains },
        companyId: companyId ? { not: companyId } : undefined,
      },
      select: { domain: true },
    });
    if (conflict)
      throw new ConflictException(
        `Domain ${conflict.domain} is already assigned to another company.`,
      );
  }

  private async syncDomains(
    tx: Prisma.TransactionClient,
    companyId: string,
    domains: string[],
  ) {
    await tx.companyDomain.deleteMany({
      where: { companyId, domain: { notIn: domains } },
    });
    const existing = new Set(
      (
        await tx.companyDomain.findMany({
          where: { companyId },
          select: { domain: true },
        })
      ).map(({ domain }) => domain),
    );
    const additions = domains.filter((domain) => !existing.has(domain));
    if (additions.length)
      await tx.companyDomain.createMany({
        data: additions.map((domain) => ({ companyId, domain })),
      });
  }

  private async syncAddresses(
    tx: Prisma.TransactionClient,
    companyId: string,
    addresses: CompanyAddressInputDto[],
  ) {
    if (!addresses.some((address) => address.isActive ?? true))
      throw new BadRequestException(
        'Company must retain at least one active delivery address.',
      );
    const existing = await tx.companyAddress.findMany({
      where: { companyId },
      select: { id: true },
    });
    const existingIds = new Set(existing.map(({ id }) => id));
    const suppliedIds = new Set(
      addresses.flatMap((address) => (address.id ? [address.id] : [])),
    );
    if ([...suppliedIds].some((addressId) => !existingIds.has(addressId)))
      throw new BadRequestException(
        'An address does not belong to this company.',
      );

    // Addresses being removed (omitted) or deactivated must not be any Employee's default.
    const retiring = [
      ...[...existingIds].filter((addressId) => !suppliedIds.has(addressId)),
      ...addresses.flatMap((address) =>
        address.id && address.isActive === false ? [address.id] : [],
      ),
    ];
    if (retiring.length > 0) {
      const affected = await tx.employee.findMany({
        where: { defaultDeliveryAddressId: { in: retiring } },
        select: {
          defaultDeliveryAddressId: true,
          defaultDeliveryAddress: { select: { label: true } },
        },
      });
      if (affected.length > 0) {
        const labels = [
          ...new Set(
            affected.map(
              ({ defaultDeliveryAddress }) =>
                defaultDeliveryAddress?.label ?? 'unknown',
            ),
          ),
        ];
        throw new ConflictException(
          `${affected.length} employee(s) use ${labels.map((label) => `'${label}'`).join(', ')} as their default delivery address. Reassign their default address before deactivating or removing it.`,
        );
      }
    }
    await tx.companyAddress.updateMany({
      where: { companyId, id: { notIn: [...suppliedIds] } },
      data: { isActive: false },
    });
    for (const address of addresses) {
      const data = this.addressData(address);
      if (address.id)
        await tx.companyAddress.update({ where: { id: address.id }, data });
      else await tx.companyAddress.create({ data: { companyId, ...data } });
    }
  }

  private addressData(address: CompanyAddressInputDto) {
    return {
      label: address.label.trim(),
      line1: address.line1.trim(),
      line2: address.line2?.trim() || null,
      city: address.city.trim(),
      region: address.region?.trim() || null,
      postalCode: address.postalCode?.trim() || null,
      country: address.country.trim(),
      isActive: address.isActive ?? true,
    };
  }

  private rethrow(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    )
      throw new ConflictException('A unique company value is already in use.');
    throw error;
  }
}
