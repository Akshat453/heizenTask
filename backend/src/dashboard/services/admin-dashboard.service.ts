import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { BusinessTimeService } from '../../business-time/business-time.service.js';
import { SettingsService } from '../../settings/settings.service.js';
import {
  OrderStatus,
  DeliveryDropStatus,
} from '../../generated/prisma/enums.js';
import {
  dbDateFromIsoDate,
  isoDateFromDbDate,
} from '../../business-time/business-time.utils.js';
import {
  businessWeek,
  deliveredSummary,
  mealsByDate,
  OPERATIONAL_STATUSES,
  shiftIsoDate,
  topCompaniesByMeals,
} from './dashboard-figures.js';
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
        _min: { deliveryDate: true },
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

    const week = businessWeek(isoToday);
    const [
      mealsAgg,
      deliveredToday,
      placedAgg,
      deliveriesByDate,
      statusGroups,
      topCompaniesThisWeek,
    ] = await Promise.all([
      this.prisma.orderLine.aggregate({
        where: {
          order: {
            deliveryDate: businessDate,
            status: { in: [...OPERATIONAL_STATUSES] },
          },
        },
        _sum: { quantity: true },
      }),
      deliveredSummary(this.prisma, { start, end }),
      this.prisma.order.aggregate({
        where: {
          status: OrderStatus.PLACED,
          deliveryDate: { gte: businessDate },
        },
        _count: { _all: true },
        _sum: { totalCents: true },
      }),
      mealsByDate(
        this.prisma,
        shiftIsoDate(isoToday, -3),
        shiftIsoDate(isoToday, 7),
      ),
      this.prisma.order.groupBy({
        by: ['status'],
        where: {
          deliveryDate: {
            gte: dbDateFromIsoDate(week.from),
            lte: dbDateFromIsoDate(week.to),
          },
        },
        _count: { _all: true },
      }),
      topCompaniesByMeals(this.prisma, week.from, week.to),
    ]);
    const statusMixThisWeek = Object.fromEntries(
      Object.values(OrderStatus).map((status) => [
        status,
        statusGroups.find((group) => group.status === status)?._count._all ?? 0,
      ]),
    ) as Record<OrderStatus, number>;
    const oldestUninvoiced = uninvoicedAgg._min.deliveryDate;

    return {
      businessDate: isoToday,
      metrics: {
        todayOrders,
        todayBillableCents: billableAgg._sum.billableTotalCents ?? 0,
        uninvoicedCents: uninvoicedAgg._sum.billableTotalCents ?? 0,
        lateKitchenOrders,
        latePrepUnits,
        activeDeliveries,
        mealsToday: mealsAgg._sum.quantity ?? 0,
        deliveredToday,
        placedAwaitingCutoff: {
          count: placedAgg._count._all,
          totalCents: placedAgg._sum.totalCents ?? 0,
        },
        oldestUninvoicedDeliveryDate: oldestUninvoiced
          ? isoDateFromDbDate(oldestUninvoiced)
          : null,
        deliveriesByDate,
        statusMixThisWeek,
        week,
        topCompaniesThisWeek,
      },
    };
  }
}
