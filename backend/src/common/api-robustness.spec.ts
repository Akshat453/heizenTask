import 'reflect-metadata';
import {
  ArgumentMetadata,
  BadRequestException,
  ConflictException,
  HttpStatus,
} from '@nestjs/common';
import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants.js';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it, vi } from 'vitest';
import { Prisma } from '../generated/prisma/client.js';
import { DayOfWeek } from '../generated/prisma/enums.js';
import { UpdatePlatformSettingsDto } from '../settings/dto/settings.dto.js';
import { SettingsService } from '../settings/settings.service.js';
import { CompaniesService } from '../companies/companies.service.js';
import {
  mapPrismaError,
  PrismaExceptionFilter,
} from './filters/prisma-exception.filter.js';
import { IdParam } from './decorators/id-param.decorator.js';
import {
  PaginationQueryDto,
  pageArgs,
  paginate,
} from './dto/pagination-query.dto.js';

const known = (code: string) =>
  new Prisma.PrismaClientKnownRequestError(`internal detail for ${code}`, {
    code,
    clientVersion: 'test',
  });

describe('Prisma error mapping', () => {
  it('maps P2002/P2003/P2034 to 409 and P2025 to 404', () => {
    expect(mapPrismaError(known('P2002')).status).toBe(HttpStatus.CONFLICT);
    expect(mapPrismaError(known('P2003')).status).toBe(HttpStatus.CONFLICT);
    expect(mapPrismaError(known('P2034')).status).toBe(HttpStatus.CONFLICT);
    expect(mapPrismaError(known('P2025')).status).toBe(HttpStatus.NOT_FOUND);
  });

  it('does not turn every database error into 409, and never leaks internals', () => {
    const other = mapPrismaError(known('P2010'));
    expect(other).toEqual({
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
    });
    expect(
      mapPrismaError(
        new Prisma.PrismaClientUnknownRequestError('boom: password=secret', {
          clientVersion: 'test',
        }),
      ).status,
    ).toBe(500);

    const json = vi.fn();
    const response = { status: vi.fn(() => ({ json })) };
    const host = { switchToHttp: () => ({ getResponse: () => response }) };
    new PrismaExceptionFilter().catch(known('P2002'), host as never);
    expect(response.status).toHaveBeenCalledWith(409);
    expect(JSON.stringify(json.mock.calls[0]![0])).not.toContain(
      'internal detail',
    );
  });
});

describe('IdParam (UUID validation)', () => {
  class Probe {
    handler(@IdParam() _id: string) {}
  }
  const pipe = () => {
    const metadata = Reflect.getMetadata(
      ROUTE_ARGS_METADATA,
      Probe,
      'handler',
    ) as Record<
      string,
      {
        pipes: Array<{
          transform: (value: string, meta: ArgumentMetadata) => Promise<string>;
        }>;
      }
    >;
    return Object.values(metadata)[0]!.pipes[0]!;
  };
  const meta: ArgumentMetadata = { type: 'param', data: 'id' };

  it('accepts v4 and the v5-shaped deterministic seed ids', async () => {
    await expect(
      pipe().transform('6f1c1a52-6f3b-4c6e-9a5e-0d6a1f2b3c4d', meta),
    ).resolves.toBeDefined();
    await expect(
      pipe().transform('90a0f1b9-0365-5c88-afb5-be1496ca8297', meta),
    ).resolves.toBeDefined();
  });

  it('rejects malformed ids with 400', async () => {
    await expect(pipe().transform('not-a-uuid', meta)).rejects.toThrow(
      BadRequestException,
    );
    await expect(pipe().transform("1' OR '1'='1", meta)).rejects.toThrow(
      BadRequestException,
    );
  });
});

describe('pagination contract', () => {
  const dto = async (query: object) => {
    const instance = plainToInstance(PaginationQueryDto, query);
    return { instance, errors: await validate(instance) };
  };

  it('defaults to page 1 / pageSize 20', async () => {
    const { instance, errors } = await dto({});
    expect(errors).toEqual([]);
    expect(pageArgs(instance)).toEqual({ skip: 0, take: 20 });
  });

  it('caps pageSize at 100 and rejects page < 1', async () => {
    expect(
      (await dto({ pageSize: '101' })).errors.map(({ property }) => property),
    ).toEqual(['pageSize']);
    expect((await dto({ pageSize: '100' })).errors).toEqual([]);
    expect(
      (await dto({ page: '0' })).errors.map(({ property }) => property),
    ).toEqual(['page']);
  });

  it('returns { data, pagination: { page, pageSize, totalItems, totalPages } }', () => {
    expect(paginate(['a'], 41, 3, 20)).toEqual({
      data: ['a'],
      pagination: { page: 3, pageSize: 20, totalItems: 41, totalPages: 3 },
    });
    expect(paginate([], 0, 1, 20).pagination.totalPages).toBe(0);
    expect(pageArgs({ page: 3, pageSize: 20 })).toEqual({ skip: 40, take: 20 });
  });
});

describe('settings validation', () => {
  const errorsFor = async (body: object) =>
    (await validate(plainToInstance(UpdatePlatformSettingsDto, body))).map(
      ({ property }) => property,
    );

  it('accepts zero for atRiskWindowMinutes and cutoffWorkingDayCount, bounding the risk window to 0..240', async () => {
    expect(
      await errorsFor({ atRiskWindowMinutes: 0, cutoffWorkingDayCount: 0 }),
    ).toEqual([]);
    expect(await errorsFor({ atRiskWindowMinutes: 240 })).toEqual([]);
    expect(await errorsFor({ atRiskWindowMinutes: 241 })).toEqual([
      'atRiskWindowMinutes',
    ]);
    expect(
      await errorsFor({ atRiskWindowMinutes: -1, cutoffWorkingDayCount: -1 }),
    ).toEqual(['cutoffWorkingDayCount', 'atRiskWindowMinutes']);
  });

  it('persists zero values (never `||` defaults)', async () => {
    const update = vi.fn();
    const service = new SettingsService({
      platformSettings: { update },
    } as never);
    await service.updateSettings({
      atRiskWindowMinutes: 0,
      cutoffWorkingDayCount: 0,
      kitchenReadyBufferMinutes: 0,
    });
    expect(update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: {
        atRiskWindowMinutes: 0,
        cutoffWorkingDayCount: 0,
        kitchenReadyBufferMinutes: 0,
      },
    });
  });

  it('rejects duplicate or empty Kitchen working days instead of silently deduplicating', async () => {
    const transaction = vi.fn();
    const service = new SettingsService({
      $transaction: transaction,
      kitchenWorkingDay: {
        deleteMany: vi.fn(),
        createMany: vi.fn(),
        findMany: vi.fn(),
      },
    } as never);
    await expect(
      service.upsertWorkingDays({ days: [DayOfWeek.MONDAY, DayOfWeek.MONDAY] }),
    ).rejects.toThrow(/Duplicate kitchen working days: MONDAY/);
    await expect(service.upsertWorkingDays({ days: [] })).rejects.toThrow(
      BadRequestException,
    );
    expect(transaction).not.toHaveBeenCalled();
  });
});

describe('Company address default protection', () => {
  it('rejects deactivating or removing an address still used as an Employee default (409 with count)', async () => {
    const tx = {
      companyAddress: {
        findMany: vi.fn().mockResolvedValue([{ id: 'a1' }, { id: 'a2' }]),
        updateMany: vi.fn(),
        update: vi.fn(),
        create: vi.fn(),
      },
      employee: {
        findMany: vi.fn().mockResolvedValue([
          {
            defaultDeliveryAddressId: 'a2',
            defaultDeliveryAddress: { label: 'Annex' },
          },
          {
            defaultDeliveryAddressId: 'a2',
            defaultDeliveryAddress: { label: 'Annex' },
          },
        ]),
      },
    };
    const service = new CompaniesService({} as never);
    const sync = (
      service as unknown as {
        syncAddresses: (
          db: unknown,
          companyId: string,
          addresses: unknown[],
        ) => Promise<void>;
      }
    ).syncAddresses.bind(service);
    const address = { label: 'HQ', line1: 'x', city: 'x', country: 'IN' };

    await expect(sync(tx, 'c1', [{ id: 'a1', ...address }])).rejects.toThrow(
      ConflictException,
    );
    await expect(sync(tx, 'c1', [{ id: 'a1', ...address }])).rejects.toThrow(
      /^2 employee\(s\) use 'Annex'/,
    );
    expect(tx.employee.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { defaultDeliveryAddressId: { in: ['a2'] } },
      }),
    );
    await expect(
      sync(tx, 'c1', [
        { id: 'a1', ...address },
        { id: 'a2', ...address, isActive: false },
      ]),
    ).rejects.toThrow(ConflictException);
    expect(tx.companyAddress.updateMany).not.toHaveBeenCalled();

    tx.employee.findMany.mockResolvedValue([]);
    await expect(
      sync(tx, 'c1', [
        { id: 'a1', ...address },
        { id: 'a2', ...address, isActive: false },
      ]),
    ).resolves.toBeUndefined();
  });
});
