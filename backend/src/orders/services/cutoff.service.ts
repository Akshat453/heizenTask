import { HttpException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { BusinessTimeService } from '../../business-time/business-time.service.js';
import { SettingsService } from '../../settings/settings.service.js';
import {
  dbDateFromIsoDate,
  isoDateFromDbDate,
} from '../../business-time/business-time.utils.js';
import { OrderStatus, OrderEventType } from '../../generated/prisma/enums.js';
import { ProcessCutoffDto } from '../dto/order.dto.js';

/** Station snapshot for PrepUnits whose Dish has no Kitchen station. */
export const UNASSIGNED_STATION_NAME = 'Unassigned';

type CandidateOutcome = 'CANCELLED' | 'CONFIRMED' | 'SKIPPED';

export type CutoffSummary = {
  processedCount: number;
  cancelledCount: number;
  confirmedCount: number;
  skippedCount: number;
  failures: Array<{ orderId: string; message: string }>;
};

@Injectable()
export class CutoffService {
  private readonly logger = new Logger(CutoffService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly businessTime: BusinessTimeService,
    private readonly settings: SettingsService,
  ) {}

  async processManual(
    dto: ProcessCutoffDto,
    actorStaffUserId: string,
  ): Promise<CutoffSummary> {
    const candidates = await this.prisma.order.findMany({
      where: {
        status: { in: [OrderStatus.DRAFT, OrderStatus.PLACED] },
        ...(dto.deliveryDate && {
          deliveryDate: dbDateFromIsoDate(dto.deliveryDate),
        }),
      },
      select: { id: true, deliveryDate: true },
      orderBy: { id: 'asc' },
    });

    const summary: CutoffSummary = {
      processedCount: 0,
      cancelledCount: 0,
      confirmedCount: 0,
      skippedCount: 0,
      failures: [],
    };
    // Settings are loaded once per run (not per order). The pre-filter is per date;
    // eligibility is re-evaluated against the clock under each Order's row lock.
    const config = await this.settings.loadForBusinessTime();
    const isDue = (isoDate: string) =>
      this.businessTime.computeCutoff(isoDate, config).passed;
    const dueDates = new Map<string, boolean>();
    for (const candidate of candidates) {
      const isoDate = isoDateFromDbDate(candidate.deliveryDate);
      if (!dueDates.has(isoDate)) dueDates.set(isoDate, isDue(isoDate));
      if (!dueDates.get(isoDate)) {
        summary.skippedCount++;
        continue;
      }
      try {
        const outcome = await this.processCandidate(
          candidate.id,
          actorStaffUserId,
          isDue,
        );
        if (outcome === 'CANCELLED') summary.cancelledCount++;
        else if (outcome === 'CONFIRMED') summary.confirmedCount++;
        else summary.skippedCount++;
      } catch (error) {
        // Never swallowed: every failure is reported to the caller and logged with detail.
        this.logger.error(
          `Cutoff processing failed for order ${candidate.id}`,
          error instanceof Error ? error.stack : String(error),
        );
        summary.failures.push({
          orderId: candidate.id,
          message:
            error instanceof HttpException
              ? error.message
              : 'Unexpected error while processing this order; see server logs.',
        });
      }
    }
    summary.processedCount = summary.cancelledCount + summary.confirmedCount;
    return summary;
  }

  /**
   * Serialized with Order edit/place on the same row lock. Everything — status,
   * cutoff eligibility, the frozen total and the PrepUnit graph — is read after
   * the lock is held, so a concurrent edit is either fully included or rejected.
   */
  private processCandidate(
    orderId: string,
    actorStaffUserId: string,
    isDue: (isoDate: string) => boolean,
  ): Promise<CandidateOutcome> {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${orderId}::uuid FOR UPDATE`;
      const order = await tx.order.findUnique({
        where: { id: orderId },
        select: { status: true, deliveryDate: true, totalCents: true },
      });
      if (
        !order ||
        (order.status !== OrderStatus.DRAFT &&
          order.status !== OrderStatus.PLACED)
      )
        return 'SKIPPED';
      if (!isDue(isoDateFromDbDate(order.deliveryDate))) return 'SKIPPED';
      const now = new Date();

      if (order.status === OrderStatus.DRAFT) {
        const { count } = await tx.order.updateMany({
          where: { id: orderId, status: OrderStatus.DRAFT },
          data: { status: OrderStatus.CANCELLED, cancelledAt: now },
        });
        if (count === 0) return 'SKIPPED';
        await tx.orderEvent.create({
          data: {
            orderId,
            type: OrderEventType.ORDER_CANCELLED,
            actorStaffUserId,
            occurredAt: now,
            message: 'Auto-cancelled draft at cutoff',
          },
        });
        return 'CANCELLED';
      }

      const { count } = await tx.order.updateMany({
        where: { id: orderId, status: OrderStatus.PLACED },
        data: {
          status: OrderStatus.CONFIRMED,
          confirmedAt: now,
          billableTotalCents: order.totalCents,
        },
      });
      if (count === 0) return 'SKIPPED';

      const lines = await tx.orderLine.findMany({
        where: { orderId },
        select: {
          dish: {
            select: { stationId: true, station: { select: { name: true } } },
          },
          combinations: { select: { id: true, quantity: true } },
        },
      });
      // Exactly one PrepUnit per OrderCombination of the locked, current graph.
      await tx.prepUnit.createMany({
        data: lines.flatMap(({ dish, combinations }) =>
          combinations.map((combination) => ({
            orderId,
            combinationId: combination.id,
            stationId: dish.stationId,
            stationNameSnapshot: dish.station?.name ?? UNASSIGNED_STATION_NAME,
            quantity: combination.quantity,
          })),
        ),
      });
      await tx.orderEvent.create({
        data: {
          orderId,
          type: OrderEventType.ORDER_CONFIRMED,
          actorStaffUserId,
          occurredAt: now,
          message: 'Confirmed at cutoff',
        },
      });
      return 'CONFIRMED';
    });
  }
}
