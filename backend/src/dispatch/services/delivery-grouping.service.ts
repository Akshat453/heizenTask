import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import {
  DeliveryDropStatus,
  OrderStatus,
  OrderEventType,
} from '../../generated/prisma/enums.js';
import { Prisma } from '../../generated/prisma/client.js';

import { DRIVER_DELIVER_PERMISSION } from '../../common/permission-keys.js';

export { DRIVER_DELIVER_PERMISSION };

/** Fields that define an Order's grouping key and a Drop's address snapshot. */
export const groupingOrderSelect = {
  companyId: true,
  deliveryAddressId: true,
  deliveryAddressLabelSnapshot: true,
  deliveryAddressLine1Snapshot: true,
  deliveryAddressLine2Snapshot: true,
  deliveryAddressCitySnapshot: true,
  deliveryAddressRegionSnapshot: true,
  deliveryAddressPostalCodeSnapshot: true,
  deliveryAddressCountrySnapshot: true,
  deliveryAt: true,
  deliveryDropId: true,
} as const satisfies Prisma.OrderSelect;
export type GroupingOrder = Prisma.OrderGetPayload<{
  select: typeof groupingOrderSelect;
}>;

/**
 * LOCK ORDERING — every transaction that touches Drop grouping must acquire locks
 * in this order and never take an earlier level while holding a later one:
 *
 *   1. Delivery-grouping advisory locks, pg_advisory_xact_lock(hashtextextended(key)),
 *      one per canonical grouping key, in ascending key order (lockGroupingKeys).
 *   2. DeliveryDrop row locks (FOR UPDATE).
 *   3. Order row locks (FOR UPDATE; ascending id when several).
 *
 * Order membership (Order.deliveryDropId) only changes while the advisory lock of
 * the Order's grouping key is held, so a Drop id read after step 1 is stable.
 * Transactions that never regroup (edit, cutoff, kitchen, billing) take only
 * Order row locks; dispatch/driver transitions take the Drop row before inserting
 * Order events (which take FK key-share locks on Order rows).
 */
@Injectable()
export class DeliveryGroupingService {
  private readonly logger = new Logger(DeliveryGroupingService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generates a deterministic canonical grouping key for an Order.
   */
  getCanonicalKey(order: {
    companyId: string;
    deliveryAddressId: string | null;
    deliveryAddressLine1Snapshot: string;
    deliveryAddressCitySnapshot: string;
    deliveryAddressPostalCodeSnapshot: string | null;
    deliveryAddressCountrySnapshot: string;
    deliveryAt: Date;
  }): string {
    const timeStr = order.deliveryAt.toISOString();

    // Prefer stable ID if present
    if (order.deliveryAddressId) {
      return `${order.companyId}|${order.deliveryAddressId}|${timeStr}`;
    }

    // Otherwise use normalized snapshot
    const normalize = (s: string | null | undefined) =>
      s ? s.trim().toLowerCase().replace(/\s+/g, ' ') : '';

    const addr = [
      normalize(order.deliveryAddressLine1Snapshot),
      normalize(order.deliveryAddressCitySnapshot),
      normalize(order.deliveryAddressPostalCodeSnapshot),
      normalize(order.deliveryAddressCountrySnapshot),
    ].join('|');

    return `${order.companyId}|${addr}|${timeStr}`;
  }

  /** Acquires grouping advisory locks for `keys` in deterministic (sorted, de-duplicated) order. */
  async lockGroupingKeys(
    tx: Prisma.TransactionClient,
    keys: readonly string[],
  ): Promise<void> {
    for (const key of [...new Set(keys)].sort()) {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${key}, 0))`;
    }
  }

  /** Deletes a mutable DISPATCH_READY Drop that no longer has any Orders. Immutable Drops are never deleted. */
  async deleteDropIfEmpty(
    tx: Prisma.TransactionClient,
    dropId: string,
  ): Promise<boolean> {
    const { count } = await tx.deliveryDrop.deleteMany({
      where: {
        id: dropId,
        status: DeliveryDropStatus.DISPATCH_READY,
        orders: { none: {} },
      },
    });
    return count > 0;
  }

  /**
   * Groups an Order's canonical key (no-op unless the whole group is Kitchen-ready).
   * Runs in its own transaction unless `providedTx` is given. Returns the mutable
   * Drop the group now uses, if any.
   */
  async ensureReadyDropForOrder(
    orderId: string,
    providedTx?: Prisma.TransactionClient,
  ): Promise<{ dropId: string | null }> {
    const execute = async (tx: Prisma.TransactionClient) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        select: groupingOrderSelect,
      });
      if (!order) return { dropId: null };
      return this.reconcileGroup(this.getCanonicalKey(order), tx, order);
    };
    return providedTx ? execute(providedTx) : this.prisma.$transaction(execute);
  }

  /**
   * Reconciles one grouping key (idempotent). Lock order: the key's advisory lock,
   * then every mutable Drop the group references (FOR UPDATE, re-checked), then
   * the Order rows via the attach update. Rules:
   *   - only CONFIRMED Orders matching the exact key take part;
   *   - Orders in OUT_FOR_DELIVERY/DELIVERED Drops are immutable and never moved;
   *   - nothing is grouped until every remaining Order of the key is Kitchen-ready;
   *   - then all of them share ONE mutable DISPATCH_READY Drop (reused, or created);
   *     stray extra mutable Drops are consolidated and removed.
   */
  async reconcileGroup(
    canonicalKey: string,
    tx: Prisma.TransactionClient,
    sample: GroupingOrder,
  ): Promise<{ dropId: string | null }> {
    await this.lockGroupingKeys(tx, [canonicalKey]);

    const loadMatching = async () =>
      (
        await tx.order.findMany({
          where: {
            companyId: sample.companyId,
            deliveryAt: sample.deliveryAt,
            status: OrderStatus.CONFIRMED,
          },
          select: { ...groupingOrderSelect, id: true, kitchenReadyAt: true },
          orderBy: { id: 'asc' },
        })
      ).filter((order) => this.getCanonicalKey(order) === canonicalKey);

    // Lock referenced Drops before trusting their status: a concurrent OUT_FOR_DELIVERY
    // transition holds the Drop row, so after this the statuses cannot change under us.
    const referencedDropIds = [
      ...new Set(
        (await loadMatching()).flatMap(({ deliveryDropId }) =>
          deliveryDropId ? [deliveryDropId] : [],
        ),
      ),
    ].sort();
    for (const dropId of referencedDropIds) {
      await tx.$queryRaw`SELECT id FROM "DeliveryDrop" WHERE id = ${dropId}::uuid FOR UPDATE`;
    }
    const drops = new Map(
      (
        await tx.deliveryDrop.findMany({
          where: { id: { in: referencedDropIds } },
          select: { id: true, status: true },
        })
      ).map((drop) => [drop.id, drop.status]),
    );

    const matching = await loadMatching();
    const eligible = matching.filter(
      ({ deliveryDropId }) =>
        !deliveryDropId ||
        drops.get(deliveryDropId) === DeliveryDropStatus.DISPATCH_READY,
    );
    if (
      eligible.length === 0 ||
      !eligible.every(({ kitchenReadyAt }) => kitchenReadyAt !== null)
    )
      return { dropId: null };

    const mutableDropIds = [
      ...new Set(
        eligible.flatMap(({ deliveryDropId }) =>
          deliveryDropId ? [deliveryDropId] : [],
        ),
      ),
    ].sort();
    let dropId = mutableDropIds[0];
    if (!dropId) {
      const first = eligible[0]!;
      const driverStaffUserId = await this.resolveDefaultDriver(
        tx,
        sample.companyId,
      );
      dropId = (
        await tx.deliveryDrop.create({
          data: {
            companyId: sample.companyId,
            scheduledDeliveryAt: sample.deliveryAt,
            addressLabelSnapshot: first.deliveryAddressLabelSnapshot,
            addressLine1Snapshot: first.deliveryAddressLine1Snapshot,
            addressLine2Snapshot: first.deliveryAddressLine2Snapshot,
            addressCitySnapshot: first.deliveryAddressCitySnapshot,
            addressRegionSnapshot: first.deliveryAddressRegionSnapshot,
            addressPostalCodeSnapshot: first.deliveryAddressPostalCodeSnapshot,
            addressCountrySnapshot: first.deliveryAddressCountrySnapshot,
            status: DeliveryDropStatus.DISPATCH_READY,
            dispatchReadyAt: new Date(),
            driverStaffUserId,
          },
          select: { id: true },
        })
      ).id;
    }

    const toAttach = eligible.filter(
      ({ deliveryDropId }) => deliveryDropId !== dropId,
    );
    if (toAttach.length > 0) {
      await tx.order.updateMany({
        where: { id: { in: toAttach.map(({ id }) => id) } },
        data: { deliveryDropId: dropId },
      });
      const newlyReady = toAttach.filter(
        ({ deliveryDropId }) => !deliveryDropId,
      );
      if (newlyReady.length > 0) {
        const now = new Date();
        await tx.orderEvent.createMany({
          data: newlyReady.map(({ id }) => ({
            orderId: id,
            type: OrderEventType.DISPATCH_READY,
            occurredAt: now,
            message: 'Order attached to Delivery Drop (Dispatch Ready)',
          })),
        });
      }
    }
    for (const extraDropId of mutableDropIds.slice(1))
      await this.deleteDropIfEmpty(tx, extraDropId);
    return { dropId };
  }

  /** Company default Driver only if active and actually holding the delivery permission; otherwise unassigned. */
  private async resolveDefaultDriver(
    tx: Prisma.TransactionClient,
    companyId: string,
  ): Promise<string | null> {
    const company = await tx.company.findUnique({
      where: { id: companyId },
      select: { defaultDriverStaffUserId: true },
    });
    if (!company?.defaultDriverStaffUserId) return null;
    const driver = await tx.staffUser.findFirst({
      where: {
        id: company.defaultDriverStaffUserId,
        isActive: true,
        role: {
          permissions: {
            some: { permission: { key: DRIVER_DELIVER_PERMISSION } },
          },
        },
      },
      select: { id: true },
    });
    if (!driver)
      this.logger.warn(
        `Company ${companyId} default driver is not an active driver; Drop left unassigned.`,
      );
    return driver?.id ?? null;
  }

  /**
   * Idempotent repair / manual grouping trigger: reconciles every key that has a
   * CONFIRMED, Kitchen-ready Order without a Drop. Each key runs in its own
   * transaction; one failing key does not block the others.
   */
  async reconcileAll() {
    const unattached = await this.prisma.order.findMany({
      where: {
        status: OrderStatus.CONFIRMED,
        kitchenReadyAt: { not: null },
        deliveryDropId: null,
      },
      select: groupingOrderSelect,
    });
    const samples = new Map<string, GroupingOrder>();
    for (const order of unattached) {
      const key = this.getCanonicalKey(order);
      if (!samples.has(key)) samples.set(key, order);
    }

    let processedGroups = 0;
    const failures: Array<{ key: string; message: string }> = [];
    for (const [key, sample] of samples) {
      try {
        await this.prisma.$transaction((tx) =>
          this.reconcileGroup(key, tx, sample),
        );
        processedGroups++;
      } catch (error) {
        this.logger.error(
          JSON.stringify({
            event: 'dispatch_reconcile_failed',
            key,
            error: error instanceof Error ? error.message : String(error),
          }),
        );
        failures.push({
          key,
          message: 'Grouping failed for this delivery group; see server logs.',
        });
      }
    }
    return {
      processedGroups,
      unattachedReadyOrdersFound: unattached.length,
      failures,
    };
  }
}
