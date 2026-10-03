import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { BusinessTimeService } from '../../business-time/business-time.service.js';
import { OrderStatus, OrderEventType } from '../../generated/prisma/enums.js';
import { ProcessCutoffDto } from '../dto/order.dto.js';

@Injectable()
export class CutoffService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly businessTime: BusinessTimeService,
  ) {}

  async processManual(dto: ProcessCutoffDto, actorStaffUserId: string) {
    const candidates = await this.prisma.order.findMany({
      where: {
        status: { in: [OrderStatus.DRAFT, OrderStatus.PLACED] },
        ...(dto.deliveryDate && { deliveryDate: new Date(dto.deliveryDate) })
      },
      select: { id: true, deliveryDate: true, status: true, totalCents: true }
    });

    let processedCount = 0;

    for (const candidate of candidates) {
      const isoDate = candidate.deliveryDate.toISOString().split('T')[0]!;
      const isOpen = await this.businessTime.isDeliveryDateOpen(isoDate);
      if (isOpen) continue; // Cutoff not reached yet

      if (candidate.status === OrderStatus.DRAFT) {
        const updated = await this.prisma.order.updateMany({
          where: { id: candidate.id, status: OrderStatus.DRAFT },
          data: { status: OrderStatus.CANCELLED, cancelledAt: new Date() }
        });
        if (updated.count > 0) {
          await this.prisma.orderEvent.create({ data: { orderId: candidate.id, type: OrderEventType.ORDER_CANCELLED, actorStaffUserId, message: 'Auto-cancelled draft at cutoff' }});
          processedCount++;
        }
      } else if (candidate.status === OrderStatus.PLACED) {
        try {
          await this.prisma.$transaction(async (tx) => {
            const updated = await tx.order.updateMany({
              where: { id: candidate.id, status: OrderStatus.PLACED },
              data: { 
                status: OrderStatus.CONFIRMED, 
                confirmedAt: new Date(),
                billableTotalCents: candidate.totalCents
              }
            });
            if (updated.count === 0) return; // Handled concurrently

            const lines = await tx.orderLine.findMany({
              where: { orderId: candidate.id },
              include: { combinations: true, dish: { select: { stationId: true, station: { select: { name: true } } } } }
            });

            for (const line of lines) {
               const stationId = line.dish.stationId;
               const stationName = line.dish.station?.name ?? 'Unknown Station';
               for (const combo of line.combinations) {
                 await tx.prepUnit.create({
                   data: {
                     orderId: candidate.id,
                     combinationId: combo.id,
                     stationId,
                     stationNameSnapshot: stationName,
                     quantity: combo.quantity,
                   }
                 });
               }
            }

            await tx.orderEvent.create({
              data: { orderId: candidate.id, type: OrderEventType.ORDER_CONFIRMED, actorStaffUserId, message: 'Confirmed at cutoff' }
            });
            
            processedCount++;
          });
        } catch (e) {
          // If concurrent transaction already made PrepUnits, it fails safely
        }
      }
    }
    return { processedCount };
  }
}
