import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { BusinessTimeService } from '../../business-time/business-time.service.js';
import { dbDateFromIsoDate } from '../../business-time/business-time.utils.js';
import { SettingsService } from '../../settings/settings.service.js';
import { OrderStatus } from '../../generated/prisma/enums.js';
import {
  calculatePlannedKitchenReadyAt,
  classifyKitchenTiming,
} from '../../kitchen/services/kitchen-timing.helper.js';

@Injectable()
export class KitchenDashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly businessTime: BusinessTimeService,
    private readonly settingsService: SettingsService,
  ) {}

  async getKitchenDashboard() {
    const isoToday = await this.businessTime.getBusinessDate();
    const now = new Date();

    const businessDate = dbDateFromIsoDate(isoToday);

    const prepUnits = await this.prisma.prepUnit.findMany({
      where: {
        order: {
          deliveryDate: businessDate, // DATE column: exact business date,
          status: OrderStatus.CONFIRMED,
        },
      },
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            deliveryAt: true,
            deliveryLeadMinutesSnapshot: true,
            company: { select: { name: true } },
          },
        },
      },
    });

    const settings = await this.settingsService.getSettings();

    let notStarted = 0;
    let started = 0;
    let atRisk = 0;
    let late = 0;

    const unfinishedDeadlines: Array<{
      time: number;
      data: {
        plannedKitchenReadyAt: string;
        orderId: string;
        orderNumber: string;
        companyName: string;
      };
    }> = [];

    for (const unit of prepUnits) {
      if (!unit.doneAt) {
        if (!unit.startedAt) {
          notStarted++;
        } else {
          started++;
        }

        const plannedKitchenReadyAt = calculatePlannedKitchenReadyAt(
          unit.order.deliveryAt,
          unit.order.deliveryLeadMinutesSnapshot,
          settings.settings.kitchenReadyBufferMinutes,
        );

        const plannedMs = plannedKitchenReadyAt.getTime();
        const timing = classifyKitchenTiming({
          plannedKitchenReadyAt,
          now,
          atRiskWindowMinutes: settings.settings.atRiskWindowMinutes,
          complete: false,
        });
        if (timing === 'LATE') late++;
        else if (timing === 'AT_RISK') atRisk++;

        unfinishedDeadlines.push({
          time: plannedMs,
          data: {
            plannedKitchenReadyAt: plannedKitchenReadyAt.toISOString(),
            orderId: unit.order.id,
            orderNumber: unit.order.orderNumber,
            companyName: unit.order.company.name,
          },
        });
      }
    }

    // Sort to find the earliest deadline
    unfinishedDeadlines.sort((a, b) => a.time - b.time);

    // Group units by order for next deadline
    let nextDeadline = null;
    if (unfinishedDeadlines.length > 0) {
      const earliest = unfinishedDeadlines[0]!;
      const remainingUnitsCount = unfinishedDeadlines.filter(
        (u) => u.data.orderId === earliest.data.orderId,
      ).length;
      nextDeadline = {
        plannedKitchenReadyAt: earliest.data.plannedKitchenReadyAt,
        orderId: earliest.data.orderId,
        orderNumber: earliest.data.orderNumber,
        companyName: earliest.data.companyName,
        remainingUnits: remainingUnitsCount,
      };
    }

    return {
      businessDate: isoToday,
      metrics: {
        notStarted,
        started,
        atRisk,
        late,
        nextDeadline,
      },
    };
  }
}
