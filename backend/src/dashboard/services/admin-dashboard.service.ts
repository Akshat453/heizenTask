import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { BusinessTimeService } from '../../business-time/business-time.service.js';
import { dbDateFromIsoDate } from '../../business-time/business-time.utils.js';
import { SettingsService } from '../../settings/settings.service.js';
import {
  OrderStatus,
  DeliveryDropStatus,
} from '../../generated/prisma/enums.js';
import {
  calculatePlannedKitchenReadyAt,
  classifyKitchenTiming,
} from '../../kitchen/services/kitchen-timing.helper.js';

@Injectable()
export class AdminDashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly businessTime: BusinessTimeService,
    private readonly settingsService: SettingsService,
  ) {}

  async getAdminDashboard() {
    const isoToday = await this.businessTime.getBusinessDate();
    const now = new Date();

    const { start, end } =
      await this.businessTime.getBusinessDateBounds(isoToday);
    const businessDate = dbDateFromIsoDate(isoToday);

    const [
      todayOrders,
      billableAgg,
      uninvoicedAgg,
      activeDeliveries,
      unfinishedKitchenOrders,
    ] = await Promise.all([
      // 1. Today's Orders (active)
      this.prisma.order.count({
        where: {
          deliveryDate: businessDate, // DATE column: exact business date,
          status: {
            notIn: [OrderStatus.CANCELLED, OrderStatus.REJECTED],
          },
        },
      }),

      // 2. Today's Billable Value
      this.prisma.order.aggregate({
        where: {
          deliveryDate: businessDate, // DATE column: exact business date,
          billableTotalCents: { not: null },
        },
        _sum: { billableTotalCents: true },
      }),

      // 3. Total Uninvoiced Amount
      this.prisma.order.aggregate({
        where: {
          billableTotalCents: { not: null },
          invoiceOrder: null,
        },
        _sum: { billableTotalCents: true },
      }),

      // 5. Active Deliveries
      this.prisma.deliveryDrop.count({
        where: {
          scheduledDeliveryAt: {
            gte: start,
            lt: end,
          },
          status: {
            in: [
              DeliveryDropStatus.DISPATCH_READY,
              DeliveryDropStatus.OUT_FOR_DELIVERY,
            ],
          },
        },
      }),

      // 4. Late Kitchen Work (requires fetching valid unfinished kitchen orders first)
      this.prisma.order.findMany({
        where: {
          status: OrderStatus.CONFIRMED,
          kitchenReadyAt: null,
        },
        select: {
          id: true,
          deliveryAt: true,
          deliveryLeadMinutesSnapshot: true,
          _count: {
            select: {
              prepUnits: {
                where: { doneAt: null },
              },
            },
          },
        },
      }),
    ]);

    // Compute Late Kitchen Work exactly
    const settings = await this.settingsService.getSettings();
    let lateKitchenOrders = 0;
    let latePrepUnits = 0;

    for (const order of unfinishedKitchenOrders) {
      if (order._count.prepUnits === 0) continue; // No unfinished prep units

      const plannedKitchenReadyAt = calculatePlannedKitchenReadyAt(
        order.deliveryAt,
        order.deliveryLeadMinutesSnapshot,
        settings.settings.kitchenReadyBufferMinutes,
      );

      const timing = classifyKitchenTiming({
        plannedKitchenReadyAt,
        now,
        atRiskWindowMinutes: settings.settings.atRiskWindowMinutes,
        complete: false,
      });
      if (timing === 'LATE') {
        lateKitchenOrders++;
        latePrepUnits += order._count.prepUnits;
      }
    }

    return {
      businessDate: isoToday,
      metrics: {
        todayOrders,
        todayBillableCents: billableAgg._sum.billableTotalCents || 0,
        uninvoicedCents: uninvoicedAgg._sum.billableTotalCents || 0,
        lateKitchenOrders,
        latePrepUnits,
        activeDeliveries,
      },
    };
  }
}
