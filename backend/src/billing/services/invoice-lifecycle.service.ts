import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { InvoiceStatus } from '../../generated/prisma/enums.js';

@Injectable()
export class InvoiceLifecycleService {
  constructor(private readonly prisma: PrismaService) {}

  async markPaid(invoiceId: string, userId: string) {
    const { count } = await this.prisma.invoice.updateMany({
      where: {
        id: invoiceId,
        status: InvoiceStatus.UNPAID,
      },
      data: {
        status: InvoiceStatus.PAID,
        paidAt: new Date(),
        paidByStaffUserId: userId,
      },
    });

    if (count === 0) {
      // It was either not found, or already paid. Let's check which.
      const invoice = await this.prisma.invoice.findUnique({
        where: { id: invoiceId },
        select: { status: true },
      });

      if (!invoice) {
        throw new NotFoundException('Invoice not found');
      }

      if (invoice.status === InvoiceStatus.PAID) {
        throw new ConflictException('Invoice is already paid');
      }
    }

    return await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
    });
  }
}
