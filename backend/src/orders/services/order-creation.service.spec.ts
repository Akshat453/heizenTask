import { vi, describe, beforeEach, it, expect } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { OrderCreationService } from './order-creation.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { PriceResolverService } from '../../pricing/price-resolver.service.js';
import { OrderValidationService } from './order-validation.service.js';
import { OrderStatus } from '../../generated/prisma/enums.js';

describe('OrderCreationService', () => {
  let service: OrderCreationService;
  let prisma: any;
  let validation: any;
  let priceResolver: any;

  beforeEach(async () => {
    prisma = {
      packagingType: { findUnique: vi.fn() },
      dish: { findMany: vi.fn() },
      option: { findUnique: vi.fn() },
      optionGroup: { findUnique: vi.fn() },
      order: { create: vi.fn(), update: vi.fn(), findUnique: vi.fn() },
      orderLine: { deleteMany: vi.fn() },
    };

    validation = {
      validateOrderGraph: vi.fn(),
    };

    priceResolver = {
      resolveTierForEmployee: vi.fn(),
      resolveDishPrice: vi.fn(),
      resolveOptionPrice: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderCreationService,
        { provide: PrismaService, useValue: prisma },
        { provide: OrderValidationService, useValue: validation },
        { provide: PriceResolverService, useValue: priceResolver },
      ],
    }).compile();

    service = module.get<OrderCreationService>(OrderCreationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // Simple mock test to ensure methods exist and can be called
  it('creates an order in DRAFT status', async () => {
    validation.validateOrderGraph.mockResolvedValue({
      employee: { id: 'emp1' },
      company: { id: 'comp1', defaultPackagingTypeId: 'pkg1', defaultDeliveryTime: new Date() },
      address: { id: 'addr1' }
    });
    prisma.packagingType.findUnique.mockResolvedValue({ id: 'pkg1', name: 'Standard' });
    priceResolver.resolveTierForEmployee.mockResolvedValue('tier1');
    prisma.dish.findMany.mockResolvedValue([]);
    
    prisma.order.create.mockResolvedValue({ id: 'ord1', status: OrderStatus.DRAFT });

    const result = await service.create({
      employeeId: 'emp1',
      deliveryDate: '2025-01-06',
      placeOrder: false,
      lines: []
    }, 'staff1');

    expect(result.id).toBe('ord1');
    expect(result.status).toBe(OrderStatus.DRAFT);
    expect(prisma.order.create).toHaveBeenCalled();
  });
});
