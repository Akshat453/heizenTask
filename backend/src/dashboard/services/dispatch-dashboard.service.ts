import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { BusinessTimeService } from '../../business-time/business-time.service.js';
import { dbDateFromIsoDate } from '../../business-time/business-time.utils.js';
import {
  DeliveryDropStatus,
  OrderStatus,
} from '../../generated/prisma/enums.js';
import { deliveredSummary } from './dashboard-figures.js';

@Injectable()
export class DispatchDashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly businessTime: BusinessTimeService,
  ) {}

  async getDispatchDashboard() {
    const isoToday = await this.businessTime.getBusinessDate();
    const now = new Date();

    const { start, end } =
      await this.businessTime.getBusinessDateBounds(isoToday);

    const [
      dispatchReady,
      unassigned,
      outForDelivery,
      lateDeliveries,
      dropsToday,
      waitingOnKitchen,
      deliveredToday,
    ] = await Promise.all([
      // 1. Dispatch Ready
      this.prisma.deliveryDrop.count({
        where: {
          scheduledDeliveryAt: {
            gte: start,
            lt: end,
          },
          status: DeliveryDropStatus.DISPATCH_READY,
        },
      }),

      // 2. Unassigned
      this.prisma.deliveryDrop.count({
        where: {
          scheduledDeliveryAt: {
            gte: start,
            lt: end,
          },
          status: DeliveryDropStatus.DISPATCH_READY,
          driverStaffUserId: null,
        },
      }),

      // 3. Out For Delivery
      this.prisma.deliveryDrop.count({
        where: {
          scheduledDeliveryAt: {
            gte: start,
            lt: end,
          },
          status: DeliveryDropStatus.OUT_FOR_DELIVERY,
        },
      }),

      // 4. Late Deliveries (Scheduled for Today AND Past Time AND Not Delivered)
      this.prisma.deliveryDrop.count({
        where: {
          scheduledDeliveryAt: {
            gte: start,
            lt: end, // scoped to today
          },
          AND: [
            { scheduledDeliveryAt: { lt: now } }, // overdue
          ],
          status: {
            not: DeliveryDropStatus.DELIVERED,
          },
        },
      }),
      // 5. All of today's Drops, any status
      this.prisma.deliveryDrop.count({
        where: { scheduledDeliveryAt: { gte: start, lt: end } },
      }),
      // 6. Today's confirmed Orders the Kitchen has not finished (no Drop yet)
      this.prisma.order.count({
        where: {
          deliveryDate: dbDateFromIsoDate(isoToday),
          status: OrderStatus.CONFIRMED,
          kitchenReadyAt: null,
        },
      }),
      // 7. Delivered today, and how many on time
      deliveredSummary(this.prisma, { start, end }),
    ]);

    return {
      businessDate: isoToday,
      metrics: {
        dispatchReady,
        unassigned,
        outForDelivery,
        lateDeliveries,
        dropsToday,
        waitingOnKitchen,
        deliveredToday,
      },
    };
  }
}
