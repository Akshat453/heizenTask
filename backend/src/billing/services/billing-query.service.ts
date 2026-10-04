import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { InvoiceQueryDto } from '../dto/billing.dto.js';
import type { Prisma } from '../../generated/prisma/client.js';
import {
  PaginationQueryDto,
  pageArgs,
  paginate,
} from '../../common/dto/pagination-query.dto.js';

@Injectable()
export class BillingQueryService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Billable (billableTotalCents frozen) Orders not yet on an Invoice, paginated.
   * Confirmed-then-cancelled Orders are included; never-confirmed ones are not.
   * totalUninvoicedCents covers the whole company, not just the page.
   */
  async getUninvoicedOrders(companyId: string, query: PaginationQueryDto) {
    const where = {
      companyId,
      billableTotalCents: { not: null },
      invoiceOrder: null,
    } satisfies Prisma.OrderWhereInput;
    const [orders, totalItems, totals] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where,
        select: {
          id: true,
          orderNumber: true,
          status: true,
          deliveryDate: true,
          deliveryAt: true,
          billableTotalCents: true,
          confirmedAt: true,
          cancelledAt: true,
          employee: { select: { name: true, email: true } },
        },
        orderBy: [{ deliveryDate: 'asc' }, { id: 'asc' }],
        ...pageArgs(query),
      }),
      this.prisma.order.count({ where }),
      this.prisma.order.aggregate({
        where,
        _sum: { billableTotalCents: true },
      }),
    ]);
    return {
      ...paginate(orders, totalItems, query.page, query.pageSize),
      totalUninvoicedCents: totals._sum.billableTotalCents ?? 0,
    };
  }

  async listInvoices(query: InvoiceQueryDto) {
    const page = query.page ?? 1;
    const pageSize = Math.min(query.pageSize ?? 20, 100);
    const skip = (page - 1) * pageSize;

    const where: Prisma.InvoiceWhereInput = {};
    if (query.companyId) {
      where.companyId = query.companyId;
    }
    if (query.status) {
      where.status = query.status;
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
          select: {
            name: true,
            billingContactName: true,
            billingContactEmail: true,
          },
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
