import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { InvoiceQueryDto } from '../dto/billing.dto.js';
import { InvoiceStatus } from '../../generated/prisma/enums.js';

@Injectable()
export class BillingQueryService {
  constructor(private readonly prisma: PrismaService) {}

  async getUninvoicedOrders(companyId: string) {
    // Only orders with frozen billableTotalCents and without an InvoiceOrder.
    // Excludes draft/placed/rejected completely.
    // Confirmed-then-cancelled are included if billableTotalCents was frozen.
    const orders = await this.prisma.order.findMany({
      where: {
        companyId,
        billableTotalCents: {
          not: null,
        },
        invoiceOrder: null,
      },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        deliveryDate: true,
        deliveryAt: true,
        billableTotalCents: true,
        confirmedAt: true,
        cancelledAt: true,
        employee: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        deliveryDate: 'asc',
      },
    });

    const totalUninvoicedCents = orders.reduce((sum: number, order: any) => sum + order.billableTotalCents!, 0);

    return {
      data: orders,
      totalUninvoicedCents,
    };
  }

  async listInvoices(query: InvoiceQueryDto) {
    const page = query.page || 1;
    const pageSize = Math.min(query.pageSize || 20, 100);
    const skip = (page - 1) * pageSize;

    const where: any = {};
    if (query.companyId) {
      where.companyId = query.companyId;
    }
    if (query.status) {
      where.status = query.status as InvoiceStatus;
    }

    const [totalItems, invoices] = await Promise.all([
      this.prisma.invoice.count({ where }),
      this.prisma.invoice.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          company: {
            select: { name: true },
          },
          _count: {
            select: { orders: true },
          },
        },
      }),
    ]);

    return {
      data: invoices,
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages: Math.ceil(totalItems / pageSize),
      },
    };
  }

  async getInvoiceDetail(invoiceId: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        company: {
          select: { name: true, billingContactName: true, billingContactEmail: true },
        },
        orders: {
          include: {
            order: {
              select: {
                orderNumber: true,
                status: true,
                deliveryDate: true,
                employee: {
                  select: { name: true },
                },
              },
            },
          },
        },
      },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    return { data: invoice };
  }
}
