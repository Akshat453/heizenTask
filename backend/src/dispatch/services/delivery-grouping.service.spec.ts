import { vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { DeliveryGroupingService } from './delivery-grouping.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';

describe('DeliveryGroupingService', () => {
  let service: DeliveryGroupingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeliveryGroupingService,
        {
          provide: PrismaService,
          useValue: {
            $transaction: vi.fn(),
            order: { findUnique: vi.fn(), findMany: vi.fn(), updateMany: vi.fn(), count: vi.fn() },
            deliveryDrop: { create: vi.fn(), delete: vi.fn() },
            company: { findUnique: vi.fn() },
            staffUser: { findUnique: vi.fn() },
            orderEvent: { createMany: vi.fn() },
          },
        },
      ],
    }).compile();

    service = module.get<DeliveryGroupingService>(DeliveryGroupingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getCanonicalKey', () => {
    it('should prefer deliveryAddressId if present', () => {
      const order: any = {
        companyId: 'C1',
        deliveryAddressId: 'A1',
        deliveryAt: new Date('2026-10-03T10:00:00.000Z'),
      };
      expect(service.getCanonicalKey(order)).toBe('C1|A1|2026-10-03T10:00:00.000Z');
    });

    it('should fallback to normalized snapshot text if deliveryAddressId is absent', () => {
      const order: any = {
        companyId: 'C1',
        deliveryAddressId: null,
        deliveryAddressLine1Snapshot: ' 123 Main St ',
        deliveryAddressCitySnapshot: 'Anytown',
        deliveryAddressPostalCodeSnapshot: null,
        deliveryAddressCountrySnapshot: '  USA',
        deliveryAt: new Date('2026-10-03T10:00:00.000Z'),
      };
      expect(service.getCanonicalKey(order)).toBe('C1|123 main st|anytown||usa|2026-10-03T10:00:00.000Z');
    });
  });
});
