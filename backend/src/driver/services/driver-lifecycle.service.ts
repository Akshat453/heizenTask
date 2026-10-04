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
  OrderStatus,
} from '../../generated/prisma/enums.js';
import { withOnTime } from '../../dispatch/drop-timing.js';
import {
  DeliveryProofService,
  type UploadedPhoto,
} from './delivery-proof.service.js';

const MAX_DELIVERY_NOTE_LENGTH = 1000;

@Injectable()
export class DriverLifecycleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly proofService: DeliveryProofService,
  ) {}

  /**
   * OUT_FOR_DELIVERY → DELIVERED for the authenticated Driver's own Drop, in one
   * transaction (lock order: Drop row, then Order rows):
   *   - the Drop CAS sets the server deliveredAt exactly once (a repeat/concurrent
   *     request gets 409 and never overwrites it);
   *   - every attached Order must be CONFIRMED and moves to DELIVERED with one
   *     DELIVERED event; financial snapshots are untouched;
   *   - inconsistent membership (any attached Order not CONFIRMED) fails the whole
   *     transition instead of delivering a partial or corrupt state.
   * The optional photo is uploaded before the transition and removed best-effort
   * if the transition does not commit.
   */
  async markDelivered(
    dropId: string,
    driverId: string,
    note?: string,
    photo?: UploadedPhoto,
  ) {
    if (
      note !== undefined &&
      (typeof note !== 'string' || note.length > MAX_DELIVERY_NOTE_LENGTH)
    ) {
      throw new BadRequestException(
        `Delivery note must be text of at most ${MAX_DELIVERY_NOTE_LENGTH} characters.`,
      );
    }
    // Pre-check before any upload; authoritative checks repeat under the lock.
    const drop = await this.prisma.deliveryDrop.findUnique({
      where: { id: dropId },
      select: { driverStaffUserId: true, status: true },
    });
    if (!drop || drop.driverStaffUserId !== driverId)
      throw new NotFoundException(
        'Delivery drop not found or not assigned to you.',
      );
    if (drop.status !== DeliveryDropStatus.OUT_FOR_DELIVERY)
      throw new ConflictException(`Cannot deliver from status ${drop.status}.`);

    const photoKey = photo
      ? await this.proofService.uploadPhoto(dropId, photo)
      : undefined;

    try {
      return await this.prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM "DeliveryDrop" WHERE id = ${dropId}::uuid FOR UPDATE`;
        const locked = await tx.deliveryDrop.findUniqueOrThrow({
          where: { id: dropId },
        });
        if (locked.driverStaffUserId !== driverId)
          throw new NotFoundException(
            'Delivery drop not found or not assigned to you.',
          );
        if (locked.status !== DeliveryDropStatus.OUT_FOR_DELIVERY)
          throw new ConflictException(
            `Cannot deliver from status ${locked.status}.`,
          );

        const orders = await tx.$queryRaw<
          Array<{ id: string; status: OrderStatus }>
        >`
          SELECT id, status FROM "Order" WHERE "deliveryDropId" = ${dropId}::uuid ORDER BY id FOR UPDATE`;
        if (orders.length === 0)
          throw new ConflictException(
            'Drop has no orders; refusing to mark it delivered.',
          );
        const inconsistent = orders.filter(
          ({ status }) => status !== OrderStatus.CONFIRMED,
        );
        if (inconsistent.length > 0) {
          throw new ConflictException(
            `Drop has orders in unexpected states (${inconsistent.map(({ id, status }) => `${id}:${status}`).join(', ')}); delivery not recorded.`,
          );
        }

        const now = new Date();
        const { count } = await tx.deliveryDrop.updateMany({
          where: {
            id: dropId,
            status: DeliveryDropStatus.OUT_FOR_DELIVERY,
            driverStaffUserId: driverId,
            deliveredAt: null,
          },
          data: {
            status: DeliveryDropStatus.DELIVERED,
            deliveredAt: now,
            ...(note?.trim() ? { deliveryNote: note.trim() } : {}),
            ...(photoKey ? { photoUrl: photoKey } : {}),
          },
        });
        if (count !== 1)
          throw new ConflictException(
            'Drop was modified concurrently and cannot be delivered.',
          );

        const orderIds = orders.map(({ id }) => id);
        const delivered = await tx.order.updateMany({
          where: { id: { in: orderIds }, status: OrderStatus.CONFIRMED },
          data: { status: OrderStatus.DELIVERED },
        });
        if (delivered.count !== orderIds.length)
          throw new ConflictException(
            'Order states changed during delivery; delivery not recorded.',
          );
        await tx.orderEvent.createMany({
          data: orderIds.map((orderId) => ({
            orderId,
            type: OrderEventType.DELIVERED,
            actorStaffUserId: driverId,
            occurredAt: now,
            message: 'Order delivered',
          })),
        });

        return withOnTime(
          await tx.deliveryDrop.findUniqueOrThrow({ where: { id: dropId } }),
        );
      });
    } catch (error) {
      if (photoKey) await this.proofService.deletePhoto(photoKey);
      throw error;
    }
  }
}
