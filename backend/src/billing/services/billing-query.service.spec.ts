import { Test, TestingModule } from '@nestjs/testing';
import { BillingQueryService } from './billing-query.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { OrderStatus } from '../../generated/prisma/enums.js';

describe('BillingQueryService', () => {
  let service: BillingQueryService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BillingQueryService,
        {
          provide: PrismaService,
          useValue: {
            order: {
              findMany: vi.fn(),
            },
            invoice: {
              count: vi.fn(),
              findMany: vi.fn(),
              findUnique: vi.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<BillingQueryService>(BillingQueryService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('getUninvoicedOrders', () => {
    it('should return orders with billableTotalCents (including confirmed-then-cancelled)', async () => {
      const mockOrders = [
        {
          id: '1',
          status: OrderStatus.CONFIRMED,
          billableTotalCents: 1000,
        },
        {
          id: '2',
          status: OrderStatus.CANCELLED,
          billableTotalCents: 500, // Confirmed-then-cancelled
        },
      ];

      (prisma.order.findMany as any).mockResolvedValue(mockOrders);

      const result = await service.getUninvoicedOrders('company-1');

      expect(prisma.order.findMany).toHaveBeenCalledWith({
        where: {
          companyId: 'company-1',
          billableTotalCents: { not: null },
          invoiceOrder: null,
        },
        select: expect.any(Object),
        orderBy: expect.any(Object),
      });

      expect(result.data).toEqual(mockOrders);
      expect(result.totalUninvoicedCents).toBe(1500);
    });
  });
});
