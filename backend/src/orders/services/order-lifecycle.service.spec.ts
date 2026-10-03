import { vi, describe, beforeEach, it, expect } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { OrderLifecycleService } from './order-lifecycle.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { OrderCreationService } from './order-creation.service.js';
import { BusinessTimeService } from '../../business-time/business-time.service.js';
import { OrderStatus } from '../../generated/prisma/enums.js';

describe('OrderLifecycleService', () => {
  let service: OrderLifecycleService;
  let prisma: any;
  let creation: any;
  let businessTime: any;

  beforeEach(async () => {
    prisma = {
      order: { findUnique: vi.fn(), update: vi.fn() },
    };

    creation = {
      update: vi.fn(),
    };

    businessTime = {
      isDeliveryDateOpen: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderLifecycleService,
        { provide: PrismaService, useValue: prisma },
        { provide: OrderCreationService, useValue: creation },
        { provide: BusinessTimeService, useValue: businessTime },
      ],
    }).compile();

    service = module.get<OrderLifecycleService>(OrderLifecycleService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('places a draft order', async () => {
    prisma.order.findUnique.mockResolvedValue({ id: 'ord1', status: OrderStatus.DRAFT, deliveryDate: new Date() });
    businessTime.isDeliveryDateOpen.mockResolvedValue(true);
    
    await service.place('ord1', 'staff1');
    expect(creation.update).toHaveBeenCalledWith('ord1', { placeOrder: true }, 'staff1');
  });

  it('cancels a placed order', async () => {
    prisma.order.findUnique.mockResolvedValue({ id: 'ord1', status: OrderStatus.PLACED });
    
    await service.cancel('ord1', 'staff1');
    expect(prisma.order.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'ord1' },
      data: expect.objectContaining({ status: OrderStatus.CANCELLED })
    }));
  });
});
