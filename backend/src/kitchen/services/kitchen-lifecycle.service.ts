import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { OrderStatus } from '../../generated/prisma/enums.js';
import { DeliveryGroupingService } from '../../dispatch/services/delivery-grouping.service.js';

@Injectable()
export class KitchenLifecycleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly deliveryGrouping: DeliveryGroupingService,
  ) {}

  async startPrepUnit(prepUnitId: string, staffUserId: string) {
    return this.prisma.$transaction(async (tx) => {
      const pu = await tx.prepUnit.findUnique({ where: { id: prepUnitId } });
      if (!pu) throw new NotFoundException('PrepUnit not found');

      // 1. Lock the Order
      await tx.$executeRaw`SELECT id FROM "Order" WHERE id = ${pu.orderId}::uuid FOR UPDATE`;

      // 2. Validate Order status
      const order = await tx.order.findUnique({ where: { id: pu.orderId } });
      if (order?.status !== OrderStatus.CONFIRMED) {
        throw new ConflictException('Order is not CONFIRMED');
      }

      // 3. Recheck PrepUnit
      const currentPu = await tx.prepUnit.findUnique({ where: { id: prepUnitId } });
      if (currentPu?.startedAt || currentPu?.doneAt) {
        throw new ConflictException('PrepUnit is already started or done');
      }

      // 4. Update PrepUnit
      const now = new Date();
      await tx.prepUnit.update({
        where: { id: prepUnitId },
        data: { startedAt: now, startedByStaffUserId: staffUserId },
      });

      // 5. Update Order.kitchenStartedAt if needed
      if (!order.kitchenStartedAt) {
        await tx.order.update({
          where: { id: order.id },
          data: { kitchenStartedAt: now },
        });
      }

      return { success: true };
    });
  }

  async completePrepUnit(prepUnitId: string, staffUserId: string) {
    let isKitchenReady = false;
    let orderIdForGrouping = '';

    const res = await this.prisma.$transaction(async (tx) => {
      const pu = await tx.prepUnit.findUnique({ where: { id: prepUnitId } });
      if (!pu) throw new NotFoundException('PrepUnit not found');
      orderIdForGrouping = pu.orderId;

      // 1. Lock the Order
      await tx.$executeRaw`SELECT id FROM "Order" WHERE id = ${pu.orderId}::uuid FOR UPDATE`;

      // 2. Validate Order status
      const order = await tx.order.findUnique({ where: { id: pu.orderId } });
      if (order?.status !== OrderStatus.CONFIRMED) {
        throw new ConflictException('Order is not CONFIRMED');
      }

      // 3. Recheck PrepUnit
      const currentPu = await tx.prepUnit.findUnique({ where: { id: prepUnitId } });
      if (currentPu?.doneAt) {
        throw new ConflictException('PrepUnit is already done');
      }

      const now = new Date();
      const updateData: any = { doneAt: now, doneByStaffUserId: staffUserId };

      // Finish unstarted records start too
      if (!currentPu?.startedAt) {
        updateData.startedAt = now;
        updateData.startedByStaffUserId = staffUserId;
      }

      // 4. Update PrepUnit
      await tx.prepUnit.update({
        where: { id: prepUnitId },
        data: updateData,
      });

      // 5. Update Order timestamps
      if (!order.kitchenStartedAt) {
        await tx.order.update({
          where: { id: order.id },
          data: { kitchenStartedAt: now },
        });
      }

      const unfinishedCount = await tx.prepUnit.count({
        where: { orderId: order.id, doneAt: null },
      });

      if (unfinishedCount === 0 && !order.kitchenReadyAt) {
        await tx.order.update({
          where: { id: order.id },
          data: { kitchenReadyAt: now },
        });
        isKitchenReady = true;
      }

      return { success: true };
    });

    if (isKitchenReady) {
      // Intentionally executed after the Kitchen transaction commits
      // to avoid nested locks or long-held DB locks
      await this.deliveryGrouping.ensureReadyDropForOrder(orderIdForGrouping).catch(err => {
        // Grouping might fail due to concurrency, but reconcile endpoint can recover
        console.error('Failed to group order after kitchen ready:', err);
      });
    }

    return res;
  }

  async forceCompleteOrder(orderId: string, staffUserId: string) {
    let isKitchenReady = false;

    const res = await this.prisma.$transaction(async (tx) => {
      // 1. Lock the Order
      const resLock = await tx.$executeRaw`SELECT id FROM "Order" WHERE id = ${orderId}::uuid FOR UPDATE`;
      if (resLock === 0) throw new NotFoundException('Order not found');

      // 2. Validate Order
      const order = await tx.order.findUnique({ where: { id: orderId } });
      if (order?.status !== OrderStatus.CONFIRMED) {
        throw new ConflictException('Order is not CONFIRMED');
      }

      const now = new Date();

      // 3. Update NOT_STARTED units
      await tx.prepUnit.updateMany({
        where: { orderId, startedAt: null, doneAt: null },
        data: {
          startedAt: now,
          startedByStaffUserId: staffUserId,
          doneAt: now,
          doneByStaffUserId: staffUserId,
        },
      });

      // 4. Update STARTED units
      await tx.prepUnit.updateMany({
        where: { orderId, startedAt: { not: null }, doneAt: null },
        data: {
          doneAt: now,
          doneByStaffUserId: staffUserId,
        },
      });

      // 5. Aggregate timestamps
      if (!order.kitchenStartedAt) {
        await tx.order.update({
          where: { id: orderId },
          data: { kitchenStartedAt: now },
        });
      }

      if (!order.kitchenReadyAt) {
        // Technically everything is done now, but let's double check to be perfectly safe
        const unfinishedCount = await tx.prepUnit.count({
          where: { orderId, doneAt: null },
        });
        if (unfinishedCount === 0) {
          await tx.order.update({
            where: { id: orderId },
            data: { kitchenReadyAt: now },
          });
          isKitchenReady = true;
        }
      }

      return { success: true };
    });

    if (isKitchenReady) {
      await this.deliveryGrouping.ensureReadyDropForOrder(orderId).catch(err => {
        console.error('Failed to group order after force complete:', err);
      });
    }

    return res;
  }
}
