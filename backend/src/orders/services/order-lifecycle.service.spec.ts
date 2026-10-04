import { vi, describe, beforeEach, it, expect } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { OrderLifecycleService } from './order-lifecycle.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { OrderCreationService } from './order-creation.service.js';
import { BusinessTimeService } from '../../business-time/business-time.service.js';
import { DeliveryGroupingService } from '../../dispatch/services/delivery-grouping.service.js';
import { OrderValidationService } from './order-validation.service.js';

describe('OrderLifecycleService', () => {
  let service: OrderLifecycleService;
  let prisma: any;
  let creation: any;
  let businessTime: any;
  let deliveryGrouping: any;

  beforeEach(async () => {
    prisma = {
      $transaction: vi.fn(async (cb) => cb(prisma)),
      $executeRaw: vi.fn(),
      order: { findUnique: vi.fn(), update: vi.fn(), count: vi.fn() },
      deliveryDrop: { delete: vi.fn() },
    };

    creation = {
      update: vi.fn(),
      place: vi.fn(),
    };

    businessTime = {
      isDeliveryDateOpen: vi.fn(),
    };

    deliveryGrouping = {
      getCanonicalKey: vi.fn().mockReturnValue('mock-key'),
      reconcileGroup: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderLifecycleService,
        { provide: PrismaService, useValue: prisma },
        { provide: OrderCreationService, useValue: creation },
        { provide: BusinessTimeService, useValue: businessTime },
        { provide: DeliveryGroupingService, useValue: deliveryGrouping },
        { provide: OrderValidationService, useValue: {} },
      ],
    }).compile();

    service = module.get<OrderLifecycleService>(OrderLifecycleService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('places a draft order through the locked revalidation transaction', async () => {
    await service.place('ord1', 'staff1');
    expect(creation.place).toHaveBeenCalledWith('ord1', 'staff1');
  });
});
