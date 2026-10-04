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
    it('paginates billable uninvoiced orders (incl. confirmed-then-cancelled) with a company-wide total', async () => {
      const mockOrders = [
        { id: '1', status: OrderStatus.CONFIRMED, billableTotalCents: 1000 },
        { id: '2', status: OrderStatus.CANCELLED, billableTotalCents: 500 }, // confirmed then cancelled
      ];
      const order = prisma.order as unknown as Record<
        string,
        ReturnType<typeof vi.fn>
      >;
      order.findMany!.mockReturnValue(mockOrders);
      order.count = vi.fn().mockReturnValue(45);
      order.aggregate = vi
        .fn()
        .mockReturnValue({ _sum: { billableTotalCents: 99_000 } });
      (
        prisma as unknown as { $transaction: ReturnType<typeof vi.fn> }
      ).$transaction = vi.fn(async (ops: unknown[]) => Promise.all(ops));

      const result = await service.getUninvoicedOrders('company-1', {
        page: 2,
        pageSize: 20,
      });

      expect(order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            companyId: 'company-1',
            billableTotalCents: { not: null },
            invoiceOrder: null,
          },
          orderBy: [{ deliveryDate: 'asc' }, { id: 'asc' }],
          skip: 20,
          take: 20,
        }),
      );
      expect(result).toEqual({
        data: mockOrders,
        pagination: { page: 2, pageSize: 20, totalItems: 45, totalPages: 3 },
        totalUninvoicedCents: 99_000,
      });
    });
  });
});
