import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { OrderEventType, OrderStatus } from '../../generated/prisma/enums.js';
import { DeliveryGroupingService } from '../../dispatch/services/delivery-grouping.service.js';
import type { PrismaDb } from '../../pricing/price-resolver.service.js';

/**
 * Result of the post-commit Kitchen → Dispatch hand-off. Grouping runs after the
 * Kitchen transaction commits (Kitchen work is never rolled back by a grouping
 * problem); a failure is reported here and repaired idempotently by
 * POST /dispatch/drops/reconcile.
 */
export type DispatchHandoff =
  | { status: 'NOT_READY' }
  | { status: 'GROUPED'; dropId: string | null }
  | {
      status: 'FAILED';
      message: string;
      recovery: 'POST /dispatch/drops/reconcile';
    };

export type KitchenTransitionResult = {
  success: true;
  orderId: string;
  kitchenReady: boolean;
  dispatch: DispatchHandoff;
};

/**
 * Kitchen transitions lock the parent Order row (FOR UPDATE) so PrepUnit changes,
 * Order.kitchenStartedAt/kitchenReadyAt and their KITCHEN_STARTED/KITCHEN_READY
 * events are written together, exactly once, even when the final PrepUnits finish
 * concurrently. Only Order row locks are taken here (see DeliveryGroupingService
 * lock ordering).
 */
@Injectable()
export class KitchenLifecycleService {
  private readonly logger = new Logger(KitchenLifecycleService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly deliveryGrouping: DeliveryGroupingService,
  ) {}

  async startPrepUnit(
    prepUnitId: string,
    staffUserId: string,
  ): Promise<KitchenTransitionResult> {
    const orderId = await this.prisma.$transaction(async (tx) => {
      const unit = await this.lockPrepUnitOrder(tx, prepUnitId);
      if (unit.startedAt || unit.doneAt)
        throw new ConflictException('PrepUnit is already started or done.');
      const now = new Date();
      const { count } = await tx.prepUnit.updateMany({
        where: { id: prepUnitId, startedAt: null, doneAt: null },
        data: { startedAt: now, startedByStaffUserId: staffUserId },
      });
      if (count !== 1)
        throw new ConflictException('PrepUnit changed concurrently.');
      await this.markKitchenStarted(tx, unit.orderId, staffUserId, now);
      return unit.orderId;
    });
    return {
      success: true,
      orderId,
      kitchenReady: false,
      dispatch: { status: 'NOT_READY' },
    };
  }

  async completePrepUnit(
    prepUnitId: string,
    staffUserId: string,
  ): Promise<KitchenTransitionResult> {
    const { orderId, becameReady } = await this.prisma.$transaction(
      async (tx) => {
        const unit = await this.lockPrepUnitOrder(tx, prepUnitId);
        if (unit.doneAt)
          throw new ConflictException('PrepUnit is already done.');
        const now = new Date();
        // Finishing an unstarted unit records both the start and the completion.
        const { count } = await tx.prepUnit.updateMany({
          where: { id: prepUnitId, doneAt: null },
          data: {
            doneAt: now,
            doneByStaffUserId: staffUserId,
            ...(unit.startedAt
              ? {}
              : { startedAt: now, startedByStaffUserId: staffUserId }),
          },
        });
        if (count !== 1)
          throw new ConflictException('PrepUnit changed concurrently.');
        await this.markKitchenStarted(tx, unit.orderId, staffUserId, now);
        return {
          orderId: unit.orderId,
          becameReady: await this.markKitchenReadyIfComplete(
            tx,
            unit.orderId,
            staffUserId,
            now,
          ),
        };
      },
    );
    return this.handOff(orderId, becameReady);
  }

  async forceCompleteOrder(
    orderId: string,
    staffUserId: string,
  ): Promise<KitchenTransitionResult> {
    const becameReady = await this.prisma.$transaction(async (tx) => {
      await this.lockConfirmedOrder(tx, orderId);
      const now = new Date();
      await tx.prepUnit.updateMany({
        where: { orderId, startedAt: null, doneAt: null },
        data: {
          startedAt: now,
          startedByStaffUserId: staffUserId,
          doneAt: now,
          doneByStaffUserId: staffUserId,
        },
      });
      await tx.prepUnit.updateMany({
        where: { orderId, startedAt: { not: null }, doneAt: null },
        data: { doneAt: now, doneByStaffUserId: staffUserId },
      });
      await this.markKitchenStarted(tx, orderId, staffUserId, now);
      return this.markKitchenReadyIfComplete(tx, orderId, staffUserId, now);
    });
    return this.handOff(orderId, becameReady);
  }

  private async lockPrepUnitOrder(tx: PrismaDb, prepUnitId: string) {
    const unit = await tx.prepUnit.findUnique({
      where: { id: prepUnitId },
      select: { orderId: true },
    });
    if (!unit) throw new NotFoundException('PrepUnit not found.');
    await this.lockConfirmedOrder(tx, unit.orderId);
    // Re-read the unit under the parent lock.
    return tx.prepUnit.findUniqueOrThrow({ where: { id: prepUnitId } });
  }

  private async lockConfirmedOrder(tx: PrismaDb, orderId: string) {
    const rows = await tx.$queryRaw<
      Array<{ status: OrderStatus }>
    >`SELECT status FROM "Order" WHERE id = ${orderId}::uuid FOR UPDATE`;
    if (rows.length === 0) throw new NotFoundException('Order not found.');
    if (rows[0]!.status !== OrderStatus.CONFIRMED)
      throw new ConflictException(
        `Kitchen work is not active for an order in status ${rows[0]!.status}.`,
      );
  }

  /** Sets Order.kitchenStartedAt and writes KITCHEN_STARTED exactly once. */
  private async markKitchenStarted(
    tx: PrismaDb,
    orderId: string,
    staffUserId: string,
    now: Date,
  ) {
    const { count } = await tx.order.updateMany({
      where: { id: orderId, kitchenStartedAt: null },
      data: { kitchenStartedAt: now },
    });
    if (count === 1) {
      await tx.orderEvent.create({
        data: {
          orderId,
          type: OrderEventType.KITCHEN_STARTED,
          actorStaffUserId: staffUserId,
          occurredAt: now,
          message: 'Kitchen work started',
        },
      });
    }
  }

  /** With the Order locked: when every PrepUnit is done, sets kitchenReadyAt and writes KITCHEN_READY exactly once. */
  private async markKitchenReadyIfComplete(
    tx: PrismaDb,
    orderId: string,
    staffUserId: string,
    now: Date,
  ): Promise<boolean> {
    if ((await tx.prepUnit.count({ where: { orderId, doneAt: null } })) > 0)
      return false;
    const { count } = await tx.order.updateMany({
      where: { id: orderId, kitchenReadyAt: null },
      data: { kitchenReadyAt: now },
    });
    if (count === 1) {
      await tx.orderEvent.create({
        data: {
          orderId,
          type: OrderEventType.KITCHEN_READY,
          actorStaffUserId: staffUserId,
          occurredAt: now,
          message: 'Kitchen work complete',
        },
      });
    }
    return count === 1;
  }

  /** Post-commit grouping; failures are logged structurally and returned, never silently swallowed. */
  private async handOff(
    orderId: string,
    kitchenReady: boolean,
  ): Promise<KitchenTransitionResult> {
    if (!kitchenReady)
      return {
        success: true,
        orderId,
        kitchenReady,
        dispatch: { status: 'NOT_READY' },
      };
    try {
      const { dropId } =
        await this.deliveryGrouping.ensureReadyDropForOrder(orderId);
      return {
        success: true,
        orderId,
        kitchenReady,
        dispatch: { status: 'GROUPED', dropId },
      };
    } catch (error) {
      this.logger.error(
        JSON.stringify({
          event: 'kitchen_dispatch_grouping_failed',
          orderId,
          error: error instanceof Error ? error.message : String(error),
        }),
        error instanceof Error ? error.stack : undefined,
      );
      return {
        success: true,
        orderId,
        kitchenReady,
        dispatch: {
          status: 'FAILED',
          message:
            'Kitchen work is saved, but the order could not be grouped for dispatch yet.',
          recovery: 'POST /dispatch/drops/reconcile',
        },
      };
    }
  }
}
