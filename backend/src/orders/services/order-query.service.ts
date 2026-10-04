import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client.js';
import { dbDateFromIsoDate } from '../../business-time/business-time.utils.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { OrderQueryDto } from '../dto/order.dto.js';

@Injectable()
export class OrderQueryService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: OrderQueryDto) {
    const page = query.page ?? 1;
    const pageSize = Math.min(query.pageSize ?? 20, 100);
    const skip = (page - 1) * pageSize;

    const where: Prisma.OrderWhereInput = {};
    if (query.deliveryDateFrom || query.deliveryDateTo) {
      where.deliveryDate = {
        ...(query.deliveryDateFrom
          ? { gte: dbDateFromIsoDate(query.deliveryDateFrom) }
          : {}),
        ...(query.deliveryDateTo
          ? { lte: dbDateFromIsoDate(query.deliveryDateTo) }
          : {}),
      };
    }
    if (query.status) where.status = query.status;
    if (query.companyId) where.companyId = query.companyId;

    if (query.invoiced === true) where.invoiceOrder = { isNot: null };
    else if (query.invoiced === false) where.invoiceOrder = null;

    if (query.search) {
      where.OR = [
        { orderNumber: { contains: query.search, mode: 'insensitive' } },
        { employee: { name: { contains: query.search, mode: 'insensitive' } } },
        { company: { name: { contains: query.search, mode: 'insensitive' } } },
      ];
    }

    const [totalItems, data] = await Promise.all([
      this.prisma.order.count({ where }),
      this.prisma.order.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: [{ deliveryDate: 'desc' }, { createdAt: 'desc' }],
        include: {
          employee: { select: { name: true } },
          company: { select: { name: true } },
          invoiceOrder: true,
        },
      }),
    ]);

    return {
      data,
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages: Math.ceil(totalItems / pageSize),
      },
    };
  }

  async get(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        employee: true,
        company: true,
        lines: {
          include: {
            combinations: {
              include: { options: true },
            },
          },
        },
        events: {
          orderBy: { occurredAt: 'asc' },
          include: { actor: { select: { name: true } } },
        },
        invoiceOrder: true,
      },
    });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }
}
