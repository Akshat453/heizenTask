import { Test, TestingModule } from '@nestjs/testing';
import { InvoiceLifecycleService } from './invoice-lifecycle.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { InvoiceStatus } from '../../generated/prisma/enums.js';

describe('InvoiceLifecycleService', () => {
  let service: InvoiceLifecycleService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvoiceLifecycleService,
        {
          provide: PrismaService,
          useValue: {
            invoice: {
              updateMany: vi.fn(),
              findUnique: vi.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<InvoiceLifecycleService>(InvoiceLifecycleService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('markPaid', () => {
    it('should update UNPAID invoice to PAID', async () => {
      (prisma.invoice.updateMany as any).mockResolvedValue({ count: 1 });
      (prisma.invoice.findUnique as any).mockResolvedValue({ id: 'inv-1', status: InvoiceStatus.PAID });

      const result = await service.markPaid('inv-1', 'user-1');

      expect(prisma.invoice.updateMany).toHaveBeenCalledWith({
        where: { id: 'inv-1', status: InvoiceStatus.UNPAID },
        data: expect.objectContaining({
          status: InvoiceStatus.PAID,
          paidByStaffUserId: 'user-1',
        }),
      });
      expect(result.status).toBe(InvoiceStatus.PAID);
    });

    it('should throw ConflictException if already paid', async () => {
      (prisma.invoice.updateMany as any).mockResolvedValue({ count: 0 });
      (prisma.invoice.findUnique as any).mockResolvedValue({
        id: 'inv-1',
        status: InvoiceStatus.PAID,
      });

      await expect(service.markPaid('inv-1', 'user-1')).rejects.toThrow(ConflictException);
    });

    it('should throw NotFoundException if invoice does not exist', async () => {
      (prisma.invoice.updateMany as any).mockResolvedValue({ count: 0 });
      (prisma.invoice.findUnique as any).mockResolvedValue(null);

      await expect(service.markPaid('inv-1', 'user-1')).rejects.toThrow(NotFoundException);
    });
  });
});
