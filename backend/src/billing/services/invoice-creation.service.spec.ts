import { Test, TestingModule } from '@nestjs/testing';
import { InvoiceCreationService } from './invoice-creation.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';

describe('InvoiceCreationService', () => {
  let service: InvoiceCreationService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvoiceCreationService,
        {
          provide: PrismaService,
          useValue: {
            $transaction: vi.fn(async (cb) => {
              const tx = {
                $queryRaw: vi.fn(),
                order: {
                  findMany: vi.fn(),
                },
                invoice: {
                  create: vi.fn(),
                },
              };
              return await cb(tx);
            }),
          },
        },
      ],
    }).compile();

    service = module.get<InvoiceCreationService>(InvoiceCreationService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('createInvoice', () => {
    it('should explicitly create invoice for confirmed-then-cancelled order with frozen billableTotalCents', async () => {
      // Order that was confirmed, billable frozen, but later cancelled
      const mockOrder = {
        id: 'order-1',
        companyId: 'company-1',
        billableTotalCents: 2400,
        invoiceOrder: null,
      };

      const txMock = {
        $queryRaw: vi.fn().mockResolvedValue([{ id: 'order-1' }]),
        order: {
          findMany: vi.fn().mockResolvedValue([mockOrder]),
        },
        invoice: {
          create: vi.fn().mockResolvedValue({ id: 'inv-1', totalCents: 2400 }),
        },
      };

      (prisma.$transaction as any).mockImplementation(async (cb) => cb(txMock));

      const result = await service.createInvoice(
        { companyId: 'company-1', orderIds: ['order-1'] },
        'user-1',
      );

      expect(result.data.id).toBe('inv-1');
      expect(txMock.invoice.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            companyId: 'company-1',
            totalCents: 2400,
            orders: {
              createMany: {
                data: [{ orderId: 'order-1', amountCents: 2400 }],
              },
            },
          }),
          include: { orders: true },
        }),
      );
    });

    it('should reject if any order is not billable', async () => {
      const mockOrder = {
        id: 'order-1',
        companyId: 'company-1',
        billableTotalCents: null,
        invoiceOrder: null,
      };

      const txMock = {
        $queryRaw: vi.fn().mockResolvedValue([{ id: 'order-1' }]),
        order: {
          findMany: vi.fn().mockResolvedValue([mockOrder]),
        },
      };

      (prisma.$transaction as any).mockImplementation(async (cb) => cb(txMock));

      await expect(
        service.createInvoice({ companyId: 'company-1', orderIds: ['order-1'] }, 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject if any order belongs to a different company', async () => {
      const mockOrder = {
        id: 'order-1',
        companyId: 'company-2',
        billableTotalCents: 1000,
        invoiceOrder: null,
      };

      const txMock = {
        $queryRaw: vi.fn().mockResolvedValue([{ id: 'order-1' }]),
        order: {
          findMany: vi.fn().mockResolvedValue([mockOrder]),
        },
      };

      (prisma.$transaction as any).mockImplementation(async (cb) => cb(txMock));

      await expect(
        service.createInvoice({ companyId: 'company-1', orderIds: ['order-1'] }, 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should translate Prisma unique constraint to ConflictException', async () => {
      const error = new Prisma.PrismaClientKnownRequestError('Unique constraint', {
        code: 'P2002',
        clientVersion: '7',
      });

      (prisma.$transaction as any).mockRejectedValue(error);

      await expect(
        service.createInvoice({ companyId: 'company-1', orderIds: ['order-1'] }, 'user-1'),
      ).rejects.toThrow(ConflictException);
    });
  });
});
