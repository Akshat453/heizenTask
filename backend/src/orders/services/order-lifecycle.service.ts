import { Injectable, NotFoundException, ConflictException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { OrderCreationService } from './order-creation.service.js';
import { OrderStatus, OrderEventType, DeliveryDropStatus } from '../../generated/prisma/enums.js';
import { BusinessTimeService } from '../../business-time/business-time.service.js';
import { RejectOrderDto, OverrideDeliveryDetailsDto } from '../dto/order.dto.js';
import { DeliveryGroupingService } from '../../dispatch/services/delivery-grouping.service.js';

@Injectable()
export class OrderLifecycleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly creation: OrderCreationService,
    private readonly businessTime: BusinessTimeService,
    private readonly deliveryGrouping: DeliveryGroupingService,
  ) {}

  async place(orderId: string, actorStaffUserId: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');
    if (order.status !== OrderStatus.DRAFT) throw new ConflictException(`Cannot place order in status ${order.status}`);

    // Check cutoff
    const isOpen = await this.businessTime.isDeliveryDateOpen(order.deliveryDate.toISOString().split('T')[0]!);
    if (!isOpen) throw new ConflictException('Cutoff has passed for this delivery date');

    // We can just update the status to PLACED. The actual repricing/revalidation happens if they "edit" it. 
    // Wait, the spec says "When an Order is PLACED: revalidate... resolve prices... recalculate... refresh snapshots... then transition".
    // I should call an `update` method in OrderCreationService.
    await this.creation.update(orderId, { placeOrder: true }, actorStaffUserId);
  }

  async cancel(orderId: string, actorStaffUserId: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');

    if (order.status === OrderStatus.CANCELLED) return;
    if (order.status === OrderStatus.REJECTED || order.status === OrderStatus.DELIVERED) {
      throw new ConflictException(`Cannot cancel order in status ${order.status}`);
    }

    if (order.status === OrderStatus.CONFIRMED) {
      // Cancellation after confirmation MUST NOT remove financial liability. billableTotalCents is preserved.
      await this.prisma.order.update({
        where: { id: orderId },
        data: {
          status: OrderStatus.CANCELLED,
          cancelledAt: new Date(),
          events: {
            create: { type: OrderEventType.ORDER_CANCELLED, actorStaffUserId, message: 'Order cancelled after confirmation (liability retained)' }
          }
        }
      });
      return;
    }

    // Pre-confirmation cancellation
    await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.CANCELLED,
        cancelledAt: new Date(),
        // financial liability removed because billableTotalCents remains null
        events: {
          create: { type: OrderEventType.ORDER_CANCELLED, actorStaffUserId, message: 'Order cancelled' }
        }
      }
    });
  }

  async reject(orderId: string, dto: RejectOrderDto, actorStaffUserId: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');

    if (order.status !== OrderStatus.PLACED) {
      throw new ConflictException(`Only PLACED orders can be rejected (current status: ${order.status})`);
    }

    await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.REJECTED,
        rejectedAt: new Date(),
        rejectionReason: dto.rejectionReason,
        events: {
          create: { type: OrderEventType.ORDER_REJECTED, actorStaffUserId, message: `Order rejected: ${dto.rejectionReason}` }
        }
      }
    });
  }

  async overrideDelivery(orderId: string, dto: OverrideDeliveryDetailsDto, actorStaffUserId: string) {
    await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT id FROM "Order" WHERE id = ${orderId}::uuid FOR UPDATE`;
      const order = await tx.order.findUnique({ 
        where: { id: orderId },
        include: { deliveryDrop: true }
      });
      if (!order) throw new NotFoundException('Order not found');

      // Reject address/time changes if attached to an immutable drop
      const isImmutableDrop = order.deliveryDrop && 
        (order.deliveryDrop.status === DeliveryDropStatus.OUT_FOR_DELIVERY || order.deliveryDrop.status === DeliveryDropStatus.DELIVERED);

      if (isImmutableDrop && (dto.deliveryAddressId || dto.deliveryAt)) {
        throw new ConflictException(`Cannot change address or time for order in an immutable ${order.deliveryDrop!.status} drop`);
      }

      // Determine OLD canonical key
      const oldCanonicalKey = this.deliveryGrouping.getCanonicalKey(order as any);
      let newCanonicalKey = oldCanonicalKey;
      let hasGroupingChange = false;

      const updateData: any = {};
      if (dto.deliveryAddressId) {
        const addr = await tx.companyAddress.findUnique({ where: { id: dto.deliveryAddressId } });
        if (!addr) throw new BadRequestException('Invalid address');
        updateData.deliveryAddressId = addr.id;
        updateData.deliveryAddressLabelSnapshot = addr.label;
        updateData.deliveryAddressLine1Snapshot = addr.line1;
        updateData.deliveryAddressLine2Snapshot = addr.line2;
        updateData.deliveryAddressCitySnapshot = addr.city;
        updateData.deliveryAddressRegionSnapshot = addr.region;
        updateData.deliveryAddressPostalCodeSnapshot = addr.postalCode;
        updateData.deliveryAddressCountrySnapshot = addr.country;
        hasGroupingChange = true;
      }
      
      if (dto.packagingTypeId) {
        const pkg = await tx.packagingType.findUnique({ where: { id: dto.packagingTypeId } });
        if (!pkg) throw new BadRequestException('Invalid packaging');
        updateData.packagingTypeId = pkg.id;
        updateData.packagingNameSnapshot = pkg.name;
      }

      if (dto.deliveryAt) {
        updateData.deliveryAt = new Date(dto.deliveryAt);
        hasGroupingChange = true;
      }

      if (Object.keys(updateData).length === 0) return; // Nothing to do

      if (hasGroupingChange) {
        // Determine NEW canonical key
        const simulatedOrder = { ...order, ...updateData };
        newCanonicalKey = this.deliveryGrouping.getCanonicalKey(simulatedOrder as any);

        if (oldCanonicalKey !== newCanonicalKey) {
          // Acquire locks in deterministic sorted order
          const keysToLock = [oldCanonicalKey, newCanonicalKey].sort();
          for (const key of keysToLock) {
            await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${key}, 0))`;
          }

          // Detach from current DISPATCH_READY drop if it exists
          if (order.deliveryDropId && !isImmutableDrop) {
            updateData.deliveryDropId = null;
          }
        }
      }

      // Perform the update
      await tx.order.update({
        where: { id: orderId },
        data: {
          ...updateData,
          events: {
            create: { type: OrderEventType.DELIVERY_DETAILS_CHANGED, actorStaffUserId, message: 'Admin delivery details overridden' }
          }
        }
      });

      // Reconcile drops if grouping changed
      if (hasGroupingChange && oldCanonicalKey !== newCanonicalKey) {
        await this.deliveryGrouping.reconcileGroup(oldCanonicalKey, tx);
        const updatedOrder = await tx.order.findUnique({ where: { id: orderId } });
        await this.deliveryGrouping.reconcileGroup(newCanonicalKey, tx, updatedOrder);
        
        // Cleanup old drop if it became empty and is DISPATCH_READY
        if (order.deliveryDropId && !isImmutableDrop) {
          const remaining = await tx.order.count({ where: { deliveryDropId: order.deliveryDropId } });
          if (remaining === 0) {
            await tx.deliveryDrop.delete({ where: { id: order.deliveryDropId } });
          }
        }
      }
    });
  }
}
