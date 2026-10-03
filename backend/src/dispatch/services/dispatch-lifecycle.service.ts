import { Injectable, NotFoundException, ConflictException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { DeliveryDropStatus, OrderEventType } from '../../generated/prisma/enums.js';

@Injectable()
export class DispatchLifecycleService {
  constructor(private readonly prisma: PrismaService) {}

  async assignDriver(dropId: string, driverId: string, actorId: string) {
    const drop = await this.prisma.deliveryDrop.findUnique({ where: { id: dropId } });
    if (!drop) throw new NotFoundException('Delivery drop not found');
    
    if (drop.status !== DeliveryDropStatus.DISPATCH_READY) {
      throw new ConflictException(`Cannot assign driver when status is ${drop.status}`);
    }

    const driver = await this.prisma.staffUser.findUnique({
      where: { id: driverId },
      include: { role: { include: { permissions: { include: { permission: true } } } } },
    });

    if (!driver) throw new NotFoundException('Driver not found');
    if (!driver.isActive) throw new BadRequestException('Driver is inactive');
    
    const hasDeliverPerm = driver.role.permissions.some(rp => rp.permission.key === 'driver.own_drops.deliver');
    if (!hasDeliverPerm) throw new ForbiddenException('User lacks delivery permission');

    await this.prisma.deliveryDrop.update({
      where: { id: dropId, status: DeliveryDropStatus.DISPATCH_READY },
      data: { driverStaffUserId: driverId },
    });

    return { success: true };
  }

  async outForDelivery(dropId: string, actorId: string) {
    return this.prisma.$transaction(async (tx) => {
      const drop = await tx.deliveryDrop.findUnique({ 
        where: { id: dropId },
        include: { orders: true }
      });
      if (!drop) throw new NotFoundException('Delivery drop not found');
      
      if (drop.status !== DeliveryDropStatus.DISPATCH_READY) {
        throw new ConflictException(`Cannot transition to OUT_FOR_DELIVERY from ${drop.status}`);
      }

      if (!drop.driverStaffUserId) {
        throw new BadRequestException('Cannot mark Out For Delivery without an assigned driver');
      }

      // 1. Conditional transition
      const updatedCount = await tx.deliveryDrop.updateMany({
        where: { id: dropId, status: DeliveryDropStatus.DISPATCH_READY },
        data: {
          status: DeliveryDropStatus.OUT_FOR_DELIVERY,
          outForDeliveryAt: new Date(),
        },
      });

      if (updatedCount.count === 0) {
        throw new ConflictException('Concurrent transition detected or drop is no longer DISPATCH_READY');
      }

      // 2. Event logging for all attached orders
      if (drop.orders.length > 0) {
        const now = new Date();
        await tx.orderEvent.createMany({
          data: drop.orders.map(order => ({
            orderId: order.id,
            type: OrderEventType.OUT_FOR_DELIVERY,
            actorStaffUserId: actorId,
            occurredAt: now,
            message: 'Order is Out for Delivery',
          })),
        });
      }

      return { success: true };
    });
  }
}
