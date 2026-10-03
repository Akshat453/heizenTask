import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { BusinessTimeService } from '../../business-time/business-time.service.js';
import { SettingsService } from '../../settings/settings.service.js';
import { OrderStatus } from '../../generated/prisma/enums.js';
import { calculatePlannedKitchenReadyAt } from '../../kitchen/services/kitchen-timing.helper.js';

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
    
    const { start, end } = await this.businessTime.getBusinessDateBounds(isoToday);

    const prepUnits = await this.prisma.prepUnit.findMany({
      where: {
        order: {
          deliveryDate: {
            gte: start,
            lt: end,
          },
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
    const atRiskWindowMs = (settings.settings.atRiskWindowMinutes || 30) * 60 * 1000;

    let notStarted = 0;
    let started = 0;
    let atRisk = 0;
    let late = 0;
    
    const unfinishedDeadlines: { time: number; data: any }[] = [];

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
        const nowMs = now.getTime();

        if (nowMs >= plannedMs) {
          late++;
        } else if (nowMs >= plannedMs - atRiskWindowMs) {
          atRisk++;
        }

        unfinishedDeadlines.push({
          time: plannedMs,
          data: {
            plannedKitchenReadyAt: plannedKitchenReadyAt.toISOString(),
            orderId: unit.order.id,
            orderNumber: unit.order.orderNumber,
            companyName: unit.order.company.name,
          }
        });
      }
    }

    // Sort to find the earliest deadline
    unfinishedDeadlines.sort((a, b) => a.time - b.time);
    
    // Group units by order for next deadline
    let nextDeadline = null;
    if (unfinishedDeadlines.length > 0) {
      const earliest = unfinishedDeadlines[0]!;
      const remainingUnitsCount = unfinishedDeadlines.filter(u => u.data.orderId === earliest.data.orderId).length;
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
