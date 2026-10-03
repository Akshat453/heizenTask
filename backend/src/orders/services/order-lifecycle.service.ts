import { Injectable, NotFoundException, ConflictException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { OrderCreationService } from './order-creation.service.js';
import { OrderStatus, OrderEventType } from '../../generated/prisma/enums.js';
import { BusinessTimeService } from '../../business-time/business-time.service.js';
import { RejectOrderDto, OverrideDeliveryDetailsDto } from '../dto/order.dto.js';

@Injectable()
export class OrderLifecycleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly creation: OrderCreationService,
    private readonly businessTime: BusinessTimeService,
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
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');

    // "Admin delivery details override, records event, doesn't touch money."
    const updateData: any = {};
    if (dto.deliveryAddressId) {
       const addr = await this.prisma.companyAddress.findUnique({ where: { id: dto.deliveryAddressId } });
       if (!addr) throw new BadRequestException('Invalid address');
       updateData.deliveryAddressId = addr.id;
       updateData.deliveryAddressLabelSnapshot = addr.label;
       updateData.deliveryAddressLine1Snapshot = addr.line1;
       updateData.deliveryAddressLine2Snapshot = addr.line2;
       updateData.deliveryAddressCitySnapshot = addr.city;
       updateData.deliveryAddressRegionSnapshot = addr.region;
       updateData.deliveryAddressPostalCodeSnapshot = addr.postalCode;
       updateData.deliveryAddressCountrySnapshot = addr.country;
    }
    
    if (dto.packagingTypeId) {
       const pkg = await this.prisma.packagingType.findUnique({ where: { id: dto.packagingTypeId } });
       if (!pkg) throw new BadRequestException('Invalid packaging');
       updateData.packagingTypeId = pkg.id;
       updateData.packagingNameSnapshot = pkg.name;
    }

    if (dto.deliveryAt) {
       updateData.deliveryAt = new Date(dto.deliveryAt);
    }

    if (Object.keys(updateData).length > 0) {
      await this.prisma.order.update({
        where: { id: orderId },
        data: {
          ...updateData,
          events: {
            create: { type: OrderEventType.DELIVERY_DETAILS_CHANGED, actorStaffUserId, message: 'Admin delivery details overridden' }
          }
        }
      });
    }
  }
}
