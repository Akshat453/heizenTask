import { vi, describe, beforeEach, it, expect } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { CutoffService } from './cutoff.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { BusinessTimeService } from '../../business-time/business-time.service.js';
import { OrderStatus } from '../../generated/prisma/enums.js';

describe('CutoffService', () => {
  let service: CutoffService;
  let prisma: any;
  let businessTime: any;

  beforeEach(async () => {
    prisma = {
      order: { findMany: vi.fn(), updateMany: vi.fn() },
      orderEvent: { create: vi.fn() },
      $transaction: vi.fn(async (cb) => {
        // mock the transaction callback execution
        const tx = {
          order: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
          orderLine: { findMany: vi.fn().mockResolvedValue([]) },
          prepUnit: { create: vi.fn() },
          orderEvent: { create: vi.fn() },
        };
        await cb(tx);
      }),
    };

    businessTime = {
      isDeliveryDateOpen: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CutoffService,
        { provide: PrismaService, useValue: prisma },
        { provide: BusinessTimeService, useValue: businessTime },
      ],
    }).compile();

    service = module.get<CutoffService>(CutoffService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('ignores orders whose delivery cutoff has not passed', async () => {
    prisma.order.findMany.mockResolvedValue([{
      id: 'ord1',
      deliveryDate: new Date('2025-01-06'),
      status: OrderStatus.PLACED,
      totalCents: 1000
    }]);
    
    // open = cutoff not passed
    businessTime.isDeliveryDateOpen.mockResolvedValue(true);
    
    const res = await service.processManual({}, 'staff1');
    expect(res.processedCount).toBe(0);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('cancels DRAFT orders when cutoff passes', async () => {
    prisma.order.findMany.mockResolvedValue([{
      id: 'ord1',
      deliveryDate: new Date('2025-01-06'),
      status: OrderStatus.DRAFT,
      totalCents: 1000
    }]);
    
    // false = cutoff passed
    businessTime.isDeliveryDateOpen.mockResolvedValue(false);
    prisma.order.updateMany.mockResolvedValue({ count: 1 });
    
    const res = await service.processManual({}, 'staff1');
    expect(res.processedCount).toBe(1);
    expect(prisma.order.updateMany).toHaveBeenCalled();
  });

  it('confirms PLACED orders via transaction when cutoff passes', async () => {
    prisma.order.findMany.mockResolvedValue([{
      id: 'ord1',
      deliveryDate: new Date('2025-01-06'),
      status: OrderStatus.PLACED,
      totalCents: 1000
    }]);
    
    // false = cutoff passed
    businessTime.isDeliveryDateOpen.mockResolvedValue(false);
    
    const res = await service.processManual({}, 'staff1');
    expect(res.processedCount).toBe(1);
    expect(prisma.$transaction).toHaveBeenCalled();
  });
});
