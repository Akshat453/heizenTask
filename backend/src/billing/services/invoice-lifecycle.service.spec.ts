import { Test, TestingModule } from '@nestjs/testing';
import { InvoiceLifecycleService } from './invoice-lifecycle.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { InvoiceStatus } from '../../generated/prisma/enums.js';

describe('InvoiceLifecycleService', () => {
  let service: InvoiceLifecycleService;
  // Plain mock functions (not PrismaService methods) so assertions don't reference unbound methods.
  const invoice = { updateMany: vi.fn(), findUnique: vi.fn() };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvoiceLifecycleService,
        {
          provide: PrismaService,
          useValue: { invoice },
        },
      ],
    }).compile();

    service = module.get<InvoiceLifecycleService>(InvoiceLifecycleService);
  });

  describe('markPaid', () => {
    it('should update UNPAID invoice to PAID', async () => {
      invoice.updateMany.mockResolvedValue({ count: 1 });
      invoice.findUnique.mockResolvedValue({
        id: 'inv-1',
        status: InvoiceStatus.PAID,
      });

      const result = await service.markPaid('inv-1', 'user-1');

      expect(invoice.updateMany).toHaveBeenCalledWith({
        where: { id: 'inv-1', status: InvoiceStatus.UNPAID },
        data: expect.objectContaining({
          status: InvoiceStatus.PAID,
          paidByStaffUserId: 'user-1',
        }),
      });
      expect(result?.status).toBe(InvoiceStatus.PAID);
    });

    it('should throw ConflictException if already paid', async () => {
      invoice.updateMany.mockResolvedValue({ count: 0 });
      invoice.findUnique.mockResolvedValue({
        id: 'inv-1',
        status: InvoiceStatus.PAID,
      });

      await expect(service.markPaid('inv-1', 'user-1')).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw NotFoundException if invoice does not exist', async () => {
      invoice.updateMany.mockResolvedValue({ count: 0 });
      invoice.findUnique.mockResolvedValue(null);

      await expect(service.markPaid('inv-1', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
