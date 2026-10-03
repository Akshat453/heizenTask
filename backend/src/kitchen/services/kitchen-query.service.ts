import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { SettingsService } from '../../settings/settings.service.js';
import { OrderStatus } from '../../generated/prisma/enums.js';

export type KitchenPrepState = 'NOT_STARTED' | 'STARTED' | 'DONE';
export type KitchenTimingState = 'ON_TRACK' | 'AT_RISK' | 'LATE' | 'COMPLETE';

export interface KitchenBoardItem {
  id: string; // prepUnit id
  orderId: string;
  orderNumber: string;
  companyName: string;
  employeeName: string;
  deliveryDate: Date;
  deliveryAt: Date;
  plannedKitchenReadyAt: Date;
  
  dishNameSnapshot: string;
  quantity: number;
  stationId: string | null;
  stationNameSnapshot: string;
  options: {
    optionGroupNameSnapshot: string;
    optionNameSnapshot: string;
    portionNameSnapshot: string | null;
  }[];

  startedAt: Date | null;
  doneAt: Date | null;

  prepState: KitchenPrepState;
  timingState: KitchenTimingState;
}

@Injectable()
export class KitchenQueryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settingsService: SettingsService,
  ) {}

  async getKitchenBoard(dateStr: string, stationIdFilter?: string): Promise<KitchenBoardItem[]> {
    const date = new Date(dateStr);
    const settings = await this.settingsService.getSettings();
    // If a unit is due within the next 60 minutes and is not done, it is at risk
    const atRiskWindowMs = 60 * 60 * 1000;
    const now = new Date();

    const where: any = {
      order: {
        deliveryDate: date,
        status: OrderStatus.CONFIRMED,
      }
    };

    if (stationIdFilter === 'unassigned') {
      where.stationId = null;
    } else if (stationIdFilter) {
      where.stationId = stationIdFilter;
    }

    const prepUnits = await this.prisma.prepUnit.findMany({
      where,
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            deliveryDate: true,
            deliveryAt: true,
            kitchenReadyAt: true,
            company: { select: { name: true } },
            employee: { select: { name: true } },
          }
        },
        combination: {
          include: {
            orderLine: {
              select: { dishNameSnapshot: true }
            },
            options: true,
          }
        }
      }
    });

    const items: KitchenBoardItem[] = prepUnits.map(unit => {
      const plannedKitchenReadyAt = new Date(unit.order.deliveryAt.getTime() - (settings.settings.kitchenReadyBufferMinutes * 60 * 1000));
      
      let prepState: KitchenPrepState = 'NOT_STARTED';
      if (unit.doneAt) {
        prepState = 'DONE';
      } else if (unit.startedAt) {
        prepState = 'STARTED';
      }

      let timingState: KitchenTimingState = 'ON_TRACK';
      if (unit.order.kitchenReadyAt || unit.doneAt) {
        timingState = 'COMPLETE';
      } else if (now.getTime() >= plannedKitchenReadyAt.getTime()) {
        timingState = 'LATE';
      } else if (now.getTime() >= plannedKitchenReadyAt.getTime() - atRiskWindowMs) {
        timingState = 'AT_RISK';
      }

      return {
        id: unit.id,
        orderId: unit.order.id,
        orderNumber: unit.order.orderNumber,
        companyName: unit.order.company.name,
        employeeName: unit.order.employee.name,
        deliveryDate: unit.order.deliveryDate,
        deliveryAt: unit.order.deliveryAt,
        plannedKitchenReadyAt,
        
        dishNameSnapshot: unit.combination.orderLine.dishNameSnapshot,
        quantity: unit.quantity,
        stationId: unit.stationId,
        stationNameSnapshot: unit.stationNameSnapshot,
        options: unit.combination.options.map(o => ({
          optionGroupNameSnapshot: o.optionGroupNameSnapshot,
          optionNameSnapshot: o.optionNameSnapshot,
          portionNameSnapshot: o.portionNameSnapshot,
        })),

        startedAt: unit.startedAt,
        doneAt: unit.doneAt,

        prepState,
        timingState,
      };
    });

    // Sort: unfinished before finished, earliest planned deadline first
    items.sort((a, b) => {
      if (a.prepState === 'DONE' && b.prepState !== 'DONE') return 1;
      if (a.prepState !== 'DONE' && b.prepState === 'DONE') return -1;
      return a.plannedKitchenReadyAt.getTime() - b.plannedKitchenReadyAt.getTime();
    });

    return items;
  }
}
