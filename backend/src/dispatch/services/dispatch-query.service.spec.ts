import { vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { DispatchQueryService } from './dispatch-query.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { BusinessTimeService } from '../../business-time/business-time.service.js';
import { DeliveryProofService } from '../../driver/services/delivery-proof.service.js';
import { DispatchQueryDto } from '../dto/dispatch.dto.js';

const DRIVER = '6f1f9b5e-0000-4000-8000-000000000001';

describe('DispatchQueryService', () => {
  let service: DispatchQueryService;
  let prisma: {
    deliveryDrop: {
      findMany: ReturnType<typeof vi.fn>;
      count: ReturnType<typeof vi.fn>;
    };
    $transaction: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    prisma = {
      deliveryDrop: {
        findMany: vi.fn().mockReturnValue('findMany'),
        count: vi.fn().mockReturnValue('count'),
      },
      $transaction: vi.fn().mockResolvedValue([[], 0]),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DispatchQueryService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: BusinessTimeService,
          useValue: { getBusinessDateBounds: vi.fn() },
        },
        {
          provide: DeliveryProofService,
          useValue: { generatePresignedUrl: vi.fn() },
        },
      ],
    }).compile();
    service = module.get<DispatchQueryService>(DispatchQueryService);
  });

  const whereFor = async (query: Partial<DispatchQueryDto>) => {
    await service.list({ page: 1, pageSize: 20, ...query } as DispatchQueryDto);
    const where = prisma.deliveryDrop.findMany.mock.calls[0]![0].where;
    // The count uses the same filter, so totalItems reflects search and driver.
    expect(prisma.deliveryDrop.count.mock.calls[0]![0].where).toEqual(where);
    return where;
  };

  it('searches company, address and driver case-insensitively', async () => {
    const where = await whereFor({ search: '  Acme ' });
    const contains = { contains: 'Acme', mode: 'insensitive' };
    expect(where.OR).toEqual([
      { company: { name: contains } },
      { addressLabelSnapshot: contains },
      { addressLine1Snapshot: contains },
      { addressLine2Snapshot: contains },
      { addressCitySnapshot: contains },
      { driver: { name: contains } },
    ]);
  });

  it('filters drops with no driver for driverId=none, and one driver by id', async () => {
    expect((await whereFor({ driverId: 'none' })).driverStaffUserId).toBeNull();
    prisma.deliveryDrop.findMany.mockClear();
    prisma.deliveryDrop.count.mockClear();
    expect((await whereFor({ driverId: DRIVER })).driverStaffUserId).toBe(
      DRIVER,
    );
  });

  it('accepts "none" or a UUID for driverId and rejects anything else', async () => {
    const errors = async (driverId: string) =>
      (await validate(plainToInstance(DispatchQueryDto, { driverId }))).map(
        (e) => e.property,
      );
    expect(await errors('none')).toEqual([]);
    expect(await errors(DRIVER)).toEqual([]);
    expect(await errors('somebody')).toEqual(['driverId']);
  });
});
