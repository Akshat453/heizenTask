import { Injectable, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CreateInvoiceDto } from '../dto/billing.dto.js';
import { Prisma } from '../../generated/prisma/client.js';
import { randomBytes } from 'crypto';

@Injectable()
export class InvoiceCreationService {
  constructor(private readonly prisma: PrismaService) {}

  private generateInvoiceNumber(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = randomBytes(4).toString('hex').toUpperCase();
    return `INV-${timestamp}-${random}`;
  }

  async createInvoice(dto: CreateInvoiceDto, userId: string) {
    if (!dto.orderIds || dto.orderIds.length === 0) {
      throw new BadRequestException('At least one Order must be supplied');
    }

    const uniqueIds = Array.from(new Set(dto.orderIds));
    if (uniqueIds.length !== dto.orderIds.length) {
      throw new BadRequestException('Duplicate Order IDs in request');
    }

    // Sort deterministically to prevent deadlocks when locking rows
    const sortedIds = uniqueIds.sort();

    try {
      return await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        // 1. Obtain row-level locks on requested Orders
        await tx.$queryRaw`SELECT id FROM "Order" WHERE id IN (${Prisma.join(sortedIds)}) ORDER BY id FOR UPDATE`;

        // 2. Reload the requested Orders and check InvoiceOrder
        const orders = await tx.order.findMany({
          where: { id: { in: sortedIds } },
          include: { invoiceOrder: true },
        });

        if (orders.length !== sortedIds.length) {
          throw new BadRequestException('One or more Orders do not exist');
        }

        let totalCents = 0;
        const invoiceOrderData: { orderId: string; amountCents: number }[] = [];

        for (const order of orders) {
          // Verify Company
          if (order.companyId !== dto.companyId) {
            throw new BadRequestException(`Order ${order.id} belongs to a different company`);
          }

          // Verify Billability
          if (order.billableTotalCents == null) {
            throw new BadRequestException(`Order ${order.id} is not billable`);
          }

          // Verify Not Invoiced
          if (order.invoiceOrder) {
            throw new ConflictException(`Order ${order.id} is already invoiced`);
          }

          totalCents += order.billableTotalCents;

          invoiceOrderData.push({
            orderId: order.id,
            amountCents: order.billableTotalCents,
          });
        }

        // Create the Invoice
        const invoice = await tx.invoice.create({
          data: {
            invoiceNumber: this.generateInvoiceNumber(),
            companyId: dto.companyId,
            totalCents,
            createdByStaffUserId: userId,
            orders: {
              createMany: {
                data: invoiceOrderData,
              },
            },
          },
          include: {
            orders: true,
          },
        });

        return { data: invoice };
      });
    } catch (error: any) {
      // Catch Prisma Unique Constraint Violation on InvoiceOrder.orderId
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException('Concurrent invoice creation detected for one or more orders');
        }
      }
      throw error;
    }
  }
}
