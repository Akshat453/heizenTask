import { vi, describe, beforeEach, it, expect } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { KitchenLifecycleService } from './kitchen-lifecycle.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { OrderStatus } from '../../generated/prisma/enums.js';
import { ConflictException } from '@nestjs/common';
import { DeliveryGroupingService } from '../../dispatch/services/delivery-grouping.service.js';

describe('KitchenLifecycleService', () => {
  let service: KitchenLifecycleService;
  let prisma: any;
  let deliveryGrouping: any;

  beforeEach(async () => {
    prisma = {
      $transaction: vi.fn(),
    };

    deliveryGrouping = {
      ensureReadyDropForOrder: vi.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KitchenLifecycleService,
        { provide: PrismaService, useValue: prisma },
        { provide: DeliveryGroupingService, useValue: deliveryGrouping },
      ],
    }).compile();

    service = module.get<KitchenLifecycleService>(KitchenLifecycleService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('starts a NOT_STARTED prep unit', async () => {
    prisma.$transaction.mockImplementation(async (cb) => {
      const tx = {
        $executeRaw: vi.fn().mockResolvedValue(1),
        order: {
          findUnique: vi.fn().mockResolvedValue({ id: 'ord1', status: OrderStatus.CONFIRMED, kitchenStartedAt: null }),
          update: vi.fn()
        },
        prepUnit: {
          findUnique: vi.fn().mockResolvedValue({ id: 'pu1', orderId: 'ord1', startedAt: null, doneAt: null }),
          update: vi.fn(),
          count: vi.fn()
        }
      };
      await cb(tx);
      expect(tx.prepUnit.update).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ startedByStaffUserId: 'staff1' })
      }));
      expect(tx.order.update).toHaveBeenCalled();
    });

    await service.startPrepUnit('pu1', 'staff1');
  });

  it('rejects starting a non-CONFIRMED order', async () => {
    prisma.$transaction.mockImplementation(async (cb) => {
      const tx = {
        $executeRaw: vi.fn().mockResolvedValue(1),
        order: { findUnique: vi.fn().mockResolvedValue({ id: 'ord1', status: OrderStatus.DRAFT }) },
        prepUnit: { findUnique: vi.fn().mockResolvedValue({ id: 'pu1', orderId: 'ord1' }) },
      };
      return cb(tx);
    });

    await expect(service.startPrepUnit('pu1', 'staff1')).rejects.toThrow(ConflictException);
  });
});
