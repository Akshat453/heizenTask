import { vi, describe, beforeEach, it, expect } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { OrderQueryService } from './order-query.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { NotFoundException } from '@nestjs/common';

describe('OrderQueryService', () => {
  let service: OrderQueryService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      order: { count: vi.fn(), findMany: vi.fn(), findUnique: vi.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderQueryService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<OrderQueryService>(OrderQueryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('lists orders with pagination', async () => {
    prisma.order.count.mockResolvedValue(100);
    prisma.order.findMany.mockResolvedValue([{ id: 'ord1' }]);

    const result = await service.list({ page: 2, pageSize: 20 });
    expect(result.pagination.totalItems).toBe(100);
    expect(result.pagination.page).toBe(2);
    expect(result.data.length).toBe(1);
    expect(prisma.order.findMany).toHaveBeenCalledWith(expect.objectContaining({
      skip: 20,
      take: 20
    }));
  });

  it('gets a single order', async () => {
    prisma.order.findUnique.mockResolvedValue({ id: 'ord1' });

    const result = await service.get('ord1');
    expect(result.id).toBe('ord1');
  });

  it('throws NotFoundException if order not found', async () => {
    prisma.order.findUnique.mockResolvedValue(null);

    await expect(service.get('ord1')).rejects.toThrow(NotFoundException);
  });
});
