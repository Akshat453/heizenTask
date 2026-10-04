import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { BusinessTimeService } from '../../business-time/business-time.service.js';
import { DeliveryDropStatus } from '../../generated/prisma/enums.js';
import { deliveredSummary } from './dashboard-figures.js';

@Injectable()
export class DriverDashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly businessTime: BusinessTimeService,
  ) {}

  async getDriverDashboard(driverId: string) {
    const isoToday = await this.businessTime.getBusinessDate();
    const { start, end } =
      await this.businessTime.getBusinessDateBounds(isoToday);

    const [todayDrops, remaining, delivered, nextDropObj, punctuality] =
      await Promise.all([
        // 1. Today's Drops
        this.prisma.deliveryDrop.count({
          where: {
            driverStaffUserId: driverId,
            scheduledDeliveryAt: {
              gte: start,
              lt: end,
            },
          },
        }),

        // 2. Remaining
        this.prisma.deliveryDrop.count({
          where: {
            driverStaffUserId: driverId,
            scheduledDeliveryAt: {
              gte: start,
              lt: end,
            },
            status: {
              not: DeliveryDropStatus.DELIVERED,
            },
          },
        }),

        // 3. Delivered
        this.prisma.deliveryDrop.count({
          where: {
            driverStaffUserId: driverId,
            scheduledDeliveryAt: {
              gte: start,
              lt: end,
            },
            status: DeliveryDropStatus.DELIVERED,
          },
        }),

        // 4. Next Drop
        this.prisma.deliveryDrop.findFirst({
          where: {
            driverStaffUserId: driverId,
            scheduledDeliveryAt: {
              gte: start,
              lt: end, // Explicitly scoped to today
            },
            status: {
              not: DeliveryDropStatus.DELIVERED,
            },
          },
          orderBy: {
            scheduledDeliveryAt: 'asc',
          },
          include: {
            company: {
              select: { name: true },
            },
          },
        }),
        // 5. On-time vs late among delivered drops
        deliveredSummary(this.prisma, {
          start,
          end,
          driverStaffUserId: driverId,
        }),
      ]);

    let nextDrop = null;
    if (nextDropObj) {
      nextDrop = {
        id: nextDropObj.id,
        scheduledDeliveryAt: nextDropObj.scheduledDeliveryAt.toISOString(),
        companyName: nextDropObj.company.name,
        addressCitySnapshot: nextDropObj.addressCitySnapshot,
        status: nextDropObj.status,
      };
    }

    return {
      businessDate: isoToday,
      metrics: {
        todayDrops,
        remaining,
        delivered,
        nextDrop,
        onTimeCount: punctuality.onTime,
        lateCount: punctuality.delivered - punctuality.onTime,
      },
    };
  }
}
