import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BusinessTimeService } from '../../business-time/business-time.service.js';
import {
  instantToBusinessDate,
  isoDateFromDbDate,
} from '../../business-time/business-time.utils.js';
import { DeliveryGroupingService } from '../../dispatch/services/delivery-grouping.service.js';
import type {
  DeliveryDrop,
  Order,
  Prisma,
} from '../../generated/prisma/client.js';
import {
  DeliveryDropStatus,
  OrderEventType,
  OrderStatus,
} from '../../generated/prisma/enums.js';
import type { PrismaDb } from '../../pricing/price-resolver.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import {
  OverrideDeliveryDetailsDto,
  RejectOrderDto,
} from '../dto/order.dto.js';
import { OrderCreationService } from './order-creation.service.js';
import { OrderValidationService } from './order-validation.service.js';

const groupingSelect = {
  companyId: true,
  deliveryAddressId: true,
  deliveryAddressLine1Snapshot: true,
  deliveryAddressCitySnapshot: true,
  deliveryAddressPostalCodeSnapshot: true,
  deliveryAddressCountrySnapshot: true,
  deliveryAt: true,
  deliveryDropId: true,
} as const satisfies Prisma.OrderSelect;
type GroupingSnapshot = Prisma.OrderGetPayload<{
  select: typeof groupingSelect;
}>;

const IMMUTABLE_DROP_STATUSES: readonly DeliveryDropStatus[] = [
  DeliveryDropStatus.OUT_FOR_DELIVERY,
  DeliveryDropStatus.DELIVERED,
];
const OVERRIDABLE_STATUSES: readonly OrderStatus[] = [
  OrderStatus.PLACED,
  OrderStatus.CONFIRMED,
];

/** Thrown inside a grouping transaction when the Order's grouping key moved before its row was locked. */
class GroupingKeyChangedError extends Error {}

/**
 * Order lifecycle transitions. Every transition locks the Order row, reloads the
 * state and applies a conditional update in one transaction; a lost race or
 * invalid state is a 409. Transitions that touch Drop grouping follow the lock
 * ordering documented on DeliveryGroupingService (advisory keys → Drop → Order).
 *
 * Repeat behaviour: place → 409 once PLACED; reject → 409 unless PLACED;
 * cancel → idempotent no-op (no extra event) once CANCELLED.
 */
@Injectable()
export class OrderLifecycleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly creation: OrderCreationService,
    private readonly businessTime: BusinessTimeService,
    private readonly deliveryGrouping: DeliveryGroupingService,
    private readonly validation: OrderValidationService,
  ) {}

  /** Revalidates, reprices and places a DRAFT inside the locked Order transaction. */
  async place(orderId: string, actorStaffUserId: string) {
    return this.creation.place(orderId, actorStaffUserId);
  }

  /**
   * DRAFT/PLACED → CANCELLED (not billable: billableTotalCents stays null).
   * CONFIRMED → CANCELLED before departure: stays fully billable (billableTotalCents
   * untouched), PrepUnits remain as history, the Order leaves its mutable
   * DISPATCH_READY Drop, the old grouping is reconciled and an emptied Drop removed —
   * all atomically. Once its Drop is OUT_FOR_DELIVERY or DELIVERED → 409.
   */
  async cancel(orderId: string, actorStaffUserId: string) {
    return this.inGroupingTransaction(
      orderId,
      () => [],
      async (tx, order, drop) => {
        if (order.status === OrderStatus.CANCELLED) return order;
        if (
          order.status === OrderStatus.REJECTED ||
          order.status === OrderStatus.DELIVERED
        ) {
          throw new ConflictException(
            `Cannot cancel order in status ${order.status}.`,
          );
        }
        if (drop && IMMUTABLE_DROP_STATUSES.includes(drop.status)) {
          throw new ConflictException(
            `Cannot cancel an order whose delivery is already ${drop.status}.`,
          );
        }

        const wasConfirmed = order.status === OrderStatus.CONFIRMED;
        const now = new Date();
        const { count } = await tx.order.updateMany({
          where: { id: orderId, status: order.status },
          data: {
            status: OrderStatus.CANCELLED,
            cancelledAt: now,
            deliveryDropId: null,
          },
        });
        if (count !== 1)
          throw new ConflictException(
            'Order changed concurrently; cancellation not applied.',
          );
        await tx.orderEvent.create({
          data: {
            orderId,
            type: OrderEventType.ORDER_CANCELLED,
            actorStaffUserId,
            occurredAt: now,
            message: wasConfirmed
              ? 'Order cancelled after confirmation (remains billable)'
              : 'Order cancelled',
          },
        });

        if (wasConfirmed) {
          // The remaining group may now be complete (or empty); reconcile under the held key lock.
          await this.deliveryGrouping.reconcileGroup(
            this.deliveryGrouping.getCanonicalKey(order),
            tx,
            order,
          );
          if (drop) await this.deliveryGrouping.deleteDropIfEmpty(tx, drop.id);
        }
        return tx.order.findUniqueOrThrow({ where: { id: orderId } });
      },
    );
  }

  /** PLACED → REJECTED. Anything else (including an already REJECTED Order) → 409. */
  async reject(orderId: string, dto: RejectOrderDto, actorStaffUserId: string) {
    return this.prisma.$transaction(async (tx) => {
      const order = await this.lockAndLoad(tx, orderId);
      if (order.status !== OrderStatus.PLACED) {
        throw new ConflictException(
          `Only PLACED orders can be rejected (current status: ${order.status}).`,
        );
      }
      const now = new Date();
      const { count } = await tx.order.updateMany({
        where: { id: orderId, status: OrderStatus.PLACED },
        data: {
          status: OrderStatus.REJECTED,
          rejectedAt: now,
          rejectionReason: dto.rejectionReason,
        },
      });
      if (count !== 1)
        throw new ConflictException(
          'Order changed concurrently; rejection not applied.',
        );
      await tx.orderEvent.create({
        data: {
          orderId,
          type: OrderEventType.ORDER_REJECTED,
          actorStaffUserId,
          occurredAt: now,
          message: `Order rejected: ${dto.rejectionReason}`,
        },
      });
      return tx.order.findUniqueOrThrow({ where: { id: orderId } });
    });
  }

  /**
   * Admin delivery override for PLACED/CONFIRMED Orders. Never reprices food or
   * touches billableTotalCents. Address/time changes are rejected once the Drop has
   * departed; before that they regroup atomically. Packaging-only changes never
   * regroup. Planned Kitchen/dispatch times are derived from deliveryAt and the
   * snapshotted lead minutes by the shared timing helper, so nothing else is stored.
   */
  async overrideDelivery(
    orderId: string,
    dto: OverrideDeliveryDetailsDto,
    actorStaffUserId: string,
  ) {
    const timezone = await this.businessTime.getTimezone();
    const requestedAt =
      dto.deliveryAt === undefined ? undefined : new Date(dto.deliveryAt);
    const targetKey = (snapshot: GroupingSnapshot) =>
      this.deliveryGrouping.getCanonicalKey({
        ...snapshot,
        deliveryAddressId: dto.deliveryAddressId ?? snapshot.deliveryAddressId,
        deliveryAt: requestedAt ?? snapshot.deliveryAt,
      });

    return this.inGroupingTransaction(
      orderId,
      (snapshot) => [targetKey(snapshot)],
      async (tx, order, drop) => {
        if (!OVERRIDABLE_STATUSES.includes(order.status)) {
          throw new ConflictException(
            `Delivery details cannot be overridden for an order in status ${order.status}.`,
          );
        }
        const data: Prisma.OrderUncheckedUpdateInput = {};
        const changes: Record<
          string,
          { from: string | null; to: string | null }
        > = {};

        if (
          dto.deliveryAddressId !== undefined &&
          dto.deliveryAddressId !== order.deliveryAddressId
        ) {
          const address = await tx.companyAddress.findUnique({
            where: { id: dto.deliveryAddressId },
          });
          if (
            !address ||
            address.companyId !== order.companyId ||
            !address.isActive
          ) {
            throw new ConflictException(
              'Delivery address must be an active address of the order’s company.',
            );
          }
          Object.assign(data, {
            deliveryAddressId: address.id,
            deliveryAddressLabelSnapshot: address.label,
            deliveryAddressLine1Snapshot: address.line1,
            deliveryAddressLine2Snapshot: address.line2,
            deliveryAddressCitySnapshot: address.city,
            deliveryAddressRegionSnapshot: address.region,
            deliveryAddressPostalCodeSnapshot: address.postalCode,
            deliveryAddressCountrySnapshot: address.country,
          } satisfies Prisma.OrderUncheckedUpdateInput);
          changes.deliveryAddressId = {
            from: order.deliveryAddressId,
            to: address.id,
          };
        }

        if (
          requestedAt !== undefined &&
          requestedAt.getTime() !== order.deliveryAt.getTime()
        ) {
          const deliveryDate = isoDateFromDbDate(order.deliveryDate);
          if (instantToBusinessDate(requestedAt, timezone) !== deliveryDate) {
            throw new ConflictException(
              `deliveryAt must fall on the order's business delivery date ${deliveryDate} (${timezone}).`,
            );
          }
          data.deliveryAt = requestedAt;
          changes.deliveryAt = {
            from: order.deliveryAt.toISOString(),
            to: requestedAt.toISOString(),
          };
        }

        if (
          dto.packagingTypeId !== undefined &&
          dto.packagingTypeId !== order.packagingTypeId
        ) {
          const packaging = await tx.packagingType.findFirst({
            where: { id: dto.packagingTypeId, isActive: true },
          });
          if (!packaging)
            throw new ConflictException('Packaging type must be active.');
          data.packagingTypeId = packaging.id;
          data.packagingNameSnapshot = packaging.name;
          changes.packagingTypeId = {
            from: order.packagingTypeId,
            to: packaging.id,
          };
        }

        const changesLocation = Boolean(
          changes.deliveryAddressId || changes.deliveryAt,
        );
        if (
          changesLocation &&
          drop &&
          IMMUTABLE_DROP_STATUSES.includes(drop.status)
        ) {
          throw new ConflictException(
            `Cannot change address or time once the delivery is ${drop.status}.`,
          );
        }
        if (Object.keys(changes).length === 0) return order;
        await this.validation.assertCompanyDeliveryDate(
          tx,
          order.companyId,
          isoDateFromDbDate(order.deliveryDate),
        );

        const oldKey = this.deliveryGrouping.getCanonicalKey(order);
        const updatedForKey = {
          ...order,
          ...(data as Partial<GroupingSnapshot>),
        };
        const regroup =
          this.deliveryGrouping.getCanonicalKey(updatedForKey) !== oldKey;
        if (regroup && drop) data.deliveryDropId = null;

        const updated = await tx.order.update({
          where: { id: orderId },
          data: {
            ...data,
            events: {
              create: {
                type: OrderEventType.DELIVERY_DETAILS_CHANGED,
                actorStaffUserId,
                message: 'Admin delivery details overridden',
                metadata: changes as Prisma.InputJsonObject,
              },
            },
          },
        });

        if (regroup && order.status === OrderStatus.CONFIRMED) {
          await this.deliveryGrouping.reconcileGroup(oldKey, tx, order);
          await this.deliveryGrouping.reconcileGroup(
            this.deliveryGrouping.getCanonicalKey(updated),
            tx,
            updated,
          );
          if (drop) await this.deliveryGrouping.deleteDropIfEmpty(tx, drop.id);
        }
        return tx.order.findUniqueOrThrow({ where: { id: orderId } });
      },
    );
  }

  private async lockAndLoad(tx: PrismaDb, orderId: string): Promise<Order> {
    const rows = await tx.$queryRaw<
      Array<{ id: string }>
    >`SELECT id FROM "Order" WHERE id = ${orderId}::uuid FOR UPDATE`;
    if (rows.length === 0) throw new NotFoundException('Order not found.');
    return tx.order.findUniqueOrThrow({ where: { id: orderId } });
  }

  /**
   * Runs `work` with the global lock order: grouping advisory locks for the Order's
   * current key (plus `extraKeys`) in sorted order, then its Drop row, then its
   * Order row. If the key or Drop membership moved between the unlocked read and
   * the row lock, the transaction is retried so no lock is taken out of order.
   */
  private async inGroupingTransaction<T>(
    orderId: string,
    extraKeys: (snapshot: GroupingSnapshot) => string[],
    work: (tx: PrismaDb, order: Order, drop: DeliveryDrop | null) => Promise<T>,
  ): Promise<T> {
    for (let attempt = 1; ; attempt++) {
      try {
        return await this.prisma.$transaction(async (tx) => {
          const snapshot = await tx.order.findUnique({
            where: { id: orderId },
            select: groupingSelect,
          });
          if (!snapshot) throw new NotFoundException('Order not found.');
          const currentKey = this.deliveryGrouping.getCanonicalKey(snapshot);
          await this.deliveryGrouping.lockGroupingKeys(tx, [
            currentKey,
            ...extraKeys(snapshot),
          ]);

          // Membership is stable while the key lock is held; lock the Drop before the Order.
          const { deliveryDropId } = await tx.order.findUniqueOrThrow({
            where: { id: orderId },
            select: { deliveryDropId: true },
          });
          let drop: DeliveryDrop | null = null;
          if (deliveryDropId) {
            await tx.$queryRaw`SELECT id FROM "DeliveryDrop" WHERE id = ${deliveryDropId}::uuid FOR UPDATE`;
            drop = await tx.deliveryDrop.findUnique({
              where: { id: deliveryDropId },
            });
          }

          const order = await this.lockAndLoad(tx, orderId);
          if (
            this.deliveryGrouping.getCanonicalKey(order) !== currentKey ||
            order.deliveryDropId !== deliveryDropId
          ) {
            throw new GroupingKeyChangedError();
          }
          return work(tx, order, drop);
        });
      } catch (error) {
        if (error instanceof GroupingKeyChangedError) {
          if (attempt < 3) continue;
          throw new ConflictException(
            'Order delivery grouping changed concurrently; please retry.',
          );
        }
        throw error;
      }
    }
  }
}
