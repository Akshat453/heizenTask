import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { DeliveryDropStatus, OrderEventType } from '../../generated/prisma/enums.js';
import { DeliveryProofService } from './delivery-proof.service.js';

@Injectable()
export class DriverLifecycleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly proofService: DeliveryProofService,
  ) {}

  async markDelivered(
    dropId: string,
    driverId: string,
    note?: string,
    photo?: any,
  ) {
    // 1. Initial verification before upload
    const drop = await this.prisma.deliveryDrop.findUnique({
      where: { id: dropId },
      include: { orders: true }
    });

    if (!drop) throw new NotFoundException('Delivery drop not found');
    if (drop.driverStaffUserId !== driverId) throw new NotFoundException('Delivery drop not found or not assigned to you');
    if (drop.status !== DeliveryDropStatus.OUT_FOR_DELIVERY) {
      throw new ConflictException(`Cannot deliver from status ${drop.status}`);
    }

    // 2. Upload photo if present
    let photoUrl: string | undefined;
    if (photo) {
      photoUrl = await this.proofService.uploadPhoto(dropId, photo);
    }

    // 3. Perform conditional database transition
    const now = new Date();
    try {
      await this.prisma.$transaction(async (tx) => {
        const updatedCount = await tx.deliveryDrop.updateMany({
          where: {
            id: dropId,
            status: DeliveryDropStatus.OUT_FOR_DELIVERY,
            driverStaffUserId: driverId,
          },
          data: {
            status: DeliveryDropStatus.DELIVERED,
            deliveredAt: now,
            ...(note && { deliveryNote: note }),
            ...(photoUrl && { photoUrl }),
          },
        });

        if (updatedCount.count === 0) {
          throw new ConflictException('Drop was modified concurrently and cannot be delivered');
        }

        // Emit events for orders
        if (drop.orders.length > 0) {
          await tx.orderEvent.createMany({
            data: drop.orders.map(o => ({
              orderId: o.id,
              type: OrderEventType.DELIVERED,
              actorStaffUserId: driverId,
              occurredAt: now,
              message: 'Order Delivered',
            })),
          });
        }
      });

      return { success: true };
    } catch (err) {
      // 4. Best effort cleanup on transition failure
      if (photoUrl) {
        await this.proofService.deletePhoto(photoUrl);
      }
      throw err;
    }
  }
}
