import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { SettingsService } from '../../settings/settings.service.js';
import { OrderStatus } from '../../generated/prisma/enums.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { dbDateFromIsoDate } from '../../business-time/business-time.utils.js';
import {
  calculatePlannedKitchenReadyAt,
  classifyKitchenTiming,
  type KitchenTimingState,
} from './kitchen-timing.helper.js';

export type KitchenPrepState = 'NOT_STARTED' | 'STARTED' | 'DONE';
export type { KitchenTimingState };

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

  async getKitchenBoard(
    dateStr: string,
    stationIdFilter?: string,
  ): Promise<KitchenBoardItem[]> {
    const date = dbDateFromIsoDate(dateStr);
    const settings = await this.settingsService.getSettings();
    const now = new Date();

    const where: Prisma.PrepUnitWhereInput = {
      order: {
        deliveryDate: date,
        status: OrderStatus.CONFIRMED,
      },
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
            deliveryLeadMinutesSnapshot: true,
            kitchenReadyAt: true,
            company: { select: { name: true } },
            employee: { select: { name: true } },
          },
        },
        combination: {
          include: {
            orderLine: {
              select: { dishNameSnapshot: true },
            },
            options: true,
          },
        },
      },
    });

    const items: KitchenBoardItem[] = prepUnits.map((unit) => {
      const plannedKitchenReadyAt = calculatePlannedKitchenReadyAt(
        unit.order.deliveryAt,
        unit.order.deliveryLeadMinutesSnapshot,
        settings.settings.kitchenReadyBufferMinutes,
      );

      let prepState: KitchenPrepState = 'NOT_STARTED';
      if (unit.doneAt) {
        prepState = 'DONE';
      } else if (unit.startedAt) {
        prepState = 'STARTED';
      }

      const timingState = classifyKitchenTiming({
        plannedKitchenReadyAt,
        now,
        atRiskWindowMinutes: settings.settings.atRiskWindowMinutes,
        complete: Boolean(unit.order.kitchenReadyAt || unit.doneAt),
      });

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
        options: unit.combination.options.map((o) => ({
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
      return (
        a.plannedKitchenReadyAt.getTime() - b.plannedKitchenReadyAt.getTime()
      );
    });

    return items;
  }
}
