import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import {
  DeliveryDropStatus,
  OrderEventType,
} from '../../generated/prisma/enums.js';
import type { PrismaDb } from '../../pricing/price-resolver.service.js';
import { withOnTime } from '../drop-timing.js';
import { DRIVER_DELIVER_PERMISSION } from './delivery-grouping.service.js';

/**
 * Dispatch transitions. Each locks the Drop row first (lock order: Drop → Orders),
 * re-checks state, and applies a conditional update; a lost race is a 409.
 */
@Injectable()
export class DispatchLifecycleService {
  constructor(private readonly prisma: PrismaService) {}

  /** Assign (or reassign) a Driver while the Drop is DISPATCH_READY. */
  async assignDriver(dropId: string, driverId: string, _actorId: string) {
    return this.prisma.$transaction(async (tx) => {
      const drop = await this.lockDrop(tx, dropId);
      if (drop.status !== DeliveryDropStatus.DISPATCH_READY) {
        throw new ConflictException(
          `Cannot assign a driver when the drop is ${drop.status}.`,
        );
      }

      const driver = await tx.staffUser.findUnique({
        where: { id: driverId },
        select: {
          id: true,
          isActive: true,
          role: {
            select: {
              permissions: {
                select: { permission: { select: { key: true } } },
              },
            },
          },
        },
      });
      if (!driver) throw new NotFoundException('Driver not found.');
      if (!driver.isActive)
        throw new BadRequestException('Driver is inactive.');
      // Capability is the actual delivery permission, not the role name.
      if (
        !driver.role.permissions.some(
          ({ permission }) => permission.key === DRIVER_DELIVER_PERMISSION,
        )
      ) {
        throw new BadRequestException(
          'Staff user does not have delivery permission.',
        );
      }

      const { count } = await tx.deliveryDrop.updateMany({
        where: { id: dropId, status: DeliveryDropStatus.DISPATCH_READY },
        data: { driverStaffUserId: driverId },
      });
      if (count !== 1)
        throw new ConflictException(
          'Drop changed concurrently; driver not assigned.',
        );
      return withOnTime(
        await tx.deliveryDrop.findUniqueOrThrow({ where: { id: dropId } }),
      );
    });
  }

  /** DISPATCH_READY → OUT_FOR_DELIVERY (requires an assigned Driver; never skipped, repeated or reversed). */
  async outForDelivery(dropId: string, actorId: string) {
    return this.prisma.$transaction(async (tx) => {
      const drop = await this.lockDrop(tx, dropId);
      if (drop.status !== DeliveryDropStatus.DISPATCH_READY) {
        throw new ConflictException(
          `Cannot transition to OUT_FOR_DELIVERY from ${drop.status}.`,
        );
      }
      if (!drop.driverStaffUserId)
        throw new ConflictException(
          'Cannot mark Out For Delivery without an assigned driver.',
        );

      const orders = await tx.order.findMany({
        where: { deliveryDropId: dropId },
        select: { id: true },
        orderBy: { id: 'asc' },
      });
      if (orders.length === 0)
        throw new ConflictException('Drop has no orders.');

      const now = new Date();
      const { count } = await tx.deliveryDrop.updateMany({
        where: { id: dropId, status: DeliveryDropStatus.DISPATCH_READY },
        data: {
          status: DeliveryDropStatus.OUT_FOR_DELIVERY,
          outForDeliveryAt: now,
        },
      });
      if (count !== 1)
        throw new ConflictException(
          'Concurrent transition detected or drop is no longer DISPATCH_READY.',
        );

      // Events for the Orders attached at transition time (membership is stable while the Drop is locked).
      await tx.orderEvent.createMany({
        data: orders.map(({ id }) => ({
          orderId: id,
          type: OrderEventType.OUT_FOR_DELIVERY,
          actorStaffUserId: actorId,
          occurredAt: now,
          message: 'Order is Out for Delivery',
        })),
      });
      return withOnTime(
        await tx.deliveryDrop.findUniqueOrThrow({ where: { id: dropId } }),
      );
    });
  }

  private async lockDrop(tx: PrismaDb, dropId: string) {
    const rows = await tx.$queryRaw<
      Array<{ id: string }>
    >`SELECT id FROM "DeliveryDrop" WHERE id = ${dropId}::uuid FOR UPDATE`;
    if (rows.length === 0)
      throw new NotFoundException('Delivery drop not found.');
    return tx.deliveryDrop.findUniqueOrThrow({ where: { id: dropId } });
  }
}
