import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { BusinessTimeService } from '../../business-time/business-time.service.js';
import { DeliveryDropStatus } from '../../generated/prisma/enums.js';

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

    const [dispatchReady, unassigned, outForDelivery, lateDeliveries] =
      await Promise.all([
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
      ]);

    return {
      businessDate: isoToday,
      metrics: {
        dispatchReady,
        unassigned,
        outForDelivery,
        lateDeliveries,
      },
    };
  }
}
