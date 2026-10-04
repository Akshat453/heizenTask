import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { BusinessTimeService } from '../../business-time/business-time.service.js';
import {
  dbDateFromIsoDate,
  isoDateFromDbDate,
} from '../../business-time/business-time.utils.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { OrderEventType, OrderStatus } from '../../generated/prisma/enums.js';
import { OrderabilityService } from '../../menu/orderability.service.js';
import type { PrismaDb } from '../../pricing/price-resolver.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type {
  CreateOrderDto,
  OrderLineDto,
  UpdateOrderDto,
} from '../dto/order.dto.js';
import { buildOrderGraph, validateOrderLines } from './order-graph.js';
import { OrderValidationService } from './order-validation.service.js';

const EDITABLE_STATUSES: readonly OrderStatus[] = [
  OrderStatus.DRAFT,
  OrderStatus.PLACED,
];

const editableOrderInclude = {
  lines: { include: { combinations: { include: { options: true } } } },
  _count: { select: { prepUnits: true } },
} as const satisfies Prisma.OrderInclude;

type EditableOrder = Prisma.OrderGetPayload<{
  include: typeof editableOrderInclude;
}>;

/**
 * Orchestrates Order create / edit / place transactions.
 * Orderability (menu/pricing) comes from OrderabilityService, delivery rules from
 * OrderValidationService, snapshot assembly from order-graph, and time from
 * BusinessTimeService.
 */
@Injectable()
export class OrderCreationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly validation: OrderValidationService,
    private readonly orderability: OrderabilityService,
    private readonly businessTime: BusinessTimeService,
  ) {}

  /** ORD-<business YYYYMM>-<random>; uses the business date, not the server's local date. */
  private generateOrderNumber(businessDate: string): string {
    return `ORD-${businessDate.slice(0, 4)}${businessDate.slice(5, 7)}-${randomBytes(4).toString('hex').toUpperCase()}`;
  }

  async create(dto: CreateOrderDto, actorStaffUserId: string) {
    if (!(await this.businessTime.isDeliveryDateOpen(dto.deliveryDate))) {
      throw new ConflictException(
        'Cutoff time for this delivery date has already passed.',
      );
    }
    const timezone = await this.businessTime.getTimezone();
    const businessDate = await this.businessTime.getBusinessDate();

    return this.prisma.$transaction(async (tx) => {
      const menu = await this.orderability.loadMenu(dto.employeeId, {
        scope: 'ORDER',
        dishIds: dto.lines.map((line) => line.dishId),
        db: tx,
      });
      const delivery = await this.validation.resolveDelivery(tx, {
        menu,
        deliveryDate: dto.deliveryDate,
        timezone,
        request: {
          deliveryAddressId: dto.deliveryAddressId,
          deliveryTime: dto.deliveryTime,
          packagingTypeId: dto.packagingTypeId,
        },
      });
      const graph = buildOrderGraph(
        validateOrderLines(dto.lines, menu.dishesById),
      );
      const now = new Date();
      const events: Prisma.OrderEventUncheckedCreateWithoutOrderInput[] = [
        {
          type: OrderEventType.ORDER_CREATED,
          actorStaffUserId,
          occurredAt: now,
          message: 'Order created',
        },
      ];
      if (dto.placeOrder)
        events.push({
          type: OrderEventType.ORDER_PLACED,
          actorStaffUserId,
          occurredAt: now,
          message: 'Order placed',
        });

      const data: Prisma.OrderUncheckedCreateInput = {
        orderNumber: this.generateOrderNumber(businessDate),
        employeeId: menu.employee.id,
        companyId: menu.employee.companyId,
        status: dto.placeOrder ? OrderStatus.PLACED : OrderStatus.DRAFT,
        deliveryDate: dbDateFromIsoDate(dto.deliveryDate),
        deliveryAt: delivery.data.deliveryAt!,
        deliveryAddressId: delivery.data.deliveryAddressId!,
        deliveryAddressLabelSnapshot:
          delivery.data.deliveryAddressLabelSnapshot!,
        deliveryAddressLine1Snapshot:
          delivery.data.deliveryAddressLine1Snapshot!,
        deliveryAddressLine2Snapshot:
          delivery.data.deliveryAddressLine2Snapshot ?? null,
        deliveryAddressCitySnapshot: delivery.data.deliveryAddressCitySnapshot!,
        deliveryAddressRegionSnapshot:
          delivery.data.deliveryAddressRegionSnapshot ?? null,
        deliveryAddressPostalCodeSnapshot:
          delivery.data.deliveryAddressPostalCodeSnapshot ?? null,
        deliveryAddressCountrySnapshot:
          delivery.data.deliveryAddressCountrySnapshot!,
        packagingTypeId: delivery.data.packagingTypeId!,
        packagingNameSnapshot: delivery.data.packagingNameSnapshot!,
        deliveryLeadMinutesSnapshot: delivery.deliveryLeadMinutes,
        subtotalCents: graph.totalCents,
        totalCents: graph.totalCents,
        billableTotalCents: null, // frozen only at confirmation
        placedAt: dto.placeOrder ? now : null,
        createdByStaffUserId: actorStaffUserId,
        lines: { create: graph.lines },
        events: { create: events },
      };
      return tx.order.create({ data });
    });
  }

  /** PATCH /orders/:id — edit a DRAFT/PLACED Order; `placeOrder: true` also places a DRAFT. */
  update(orderId: string, dto: UpdateOrderDto, actorStaffUserId: string) {
    return this.mutateEditable(
      orderId,
      dto,
      actorStaffUserId,
      dto.placeOrder === true ? 'PLACE_IF_DRAFT' : 'EDIT',
    );
  }

  /** POST /orders/:id/place — DRAFT → PLACED after revalidation and repricing. */
  place(orderId: string, actorStaffUserId: string) {
    return this.mutateEditable(orderId, {}, actorStaffUserId, 'PLACE');
  }

  /**
   * One transaction, serialized with cutoff on the Order row lock:
   * lock → reload → status/cutoff/PrepUnit checks → authoritative revalidation and
   * repricing → FK-safe child-first replacement → snapshots/totals/status/event.
   */
  private mutateEditable(
    orderId: string,
    dto: UpdateOrderDto,
    actorStaffUserId: string,
    mode: 'EDIT' | 'PLACE' | 'PLACE_IF_DRAFT',
  ) {
    return this.prisma.$transaction(async (tx) => {
      await this.lockOrder(tx, orderId);
      const order = await tx.order.findUniqueOrThrow({
        where: { id: orderId },
        include: editableOrderInclude,
      });

      if (!EDITABLE_STATUSES.includes(order.status))
        throw new ConflictException(
          `Cannot edit order in status ${order.status}.`,
        );
      if (mode === 'PLACE' && order.status !== OrderStatus.DRAFT)
        throw new ConflictException(
          `Cannot place order in status ${order.status}.`,
        );

      const deliveryDate = isoDateFromDbDate(order.deliveryDate);
      if (!(await this.businessTime.isDeliveryDateOpen(deliveryDate)))
        throw new ConflictException(
          'Cutoff has passed for this delivery date.',
        );
      if (order._count.prepUnits > 0)
        throw new ConflictException(
          'Order already has Kitchen work and cannot be edited.',
        );

      const lines = dto.lines ?? this.existingLines(order);
      const menu = await this.orderability.loadMenu(order.employeeId, {
        scope: 'ORDER',
        dishIds: lines.map((line) => line.dishId),
        db: tx,
      });
      if (menu.employee.companyId !== order.companyId) {
        throw new ConflictException(
          'Employee has moved to another company; this order can no longer be edited.',
        );
      }
      const delivery = await this.validation.resolveDelivery(tx, {
        menu,
        deliveryDate,
        timezone: await this.businessTime.getTimezone(),
        request: {
          deliveryAddressId: dto.deliveryAddressId,
          deliveryTime: dto.deliveryTime,
          packagingTypeId: dto.packagingTypeId,
        },
        existing: {
          deliveryAddressId: order.deliveryAddressId,
          deliveryAt: order.deliveryAt,
          packagingTypeId: order.packagingTypeId,
        },
      });
      const graph = buildOrderGraph(validateOrderLines(lines, menu.dishesById));

      // FK-safe replacement: Restrict relations require children first.
      await tx.orderCombinationOption.deleteMany({
        where: { combination: { orderLine: { orderId } } },
      });
      await tx.orderCombination.deleteMany({
        where: { orderLine: { orderId } },
      });
      await tx.orderLine.deleteMany({ where: { orderId } });

      // A PLACED Order is never reverted to DRAFT by an edit.
      const placing = order.status === OrderStatus.DRAFT && mode !== 'EDIT';
      const now = new Date();
      const data: Prisma.OrderUncheckedUpdateInput = {
        ...delivery.data,
        subtotalCents: graph.totalCents,
        totalCents: graph.totalCents,
        lines: { create: graph.lines },
        ...(placing && {
          status: OrderStatus.PLACED,
          placedAt: now,
          events: {
            create: {
              type: OrderEventType.ORDER_PLACED,
              actorStaffUserId,
              occurredAt: now,
              message: 'Order placed',
            },
          },
        }),
      };
      return tx.order.update({ where: { id: orderId }, data });
    });
  }

  private async lockOrder(tx: PrismaDb, orderId: string) {
    const rows = await tx.$queryRaw<
      Array<{ id: string }>
    >`SELECT id FROM "Order" WHERE id = ${orderId}::uuid FOR UPDATE`;
    if (rows.length === 0) throw new NotFoundException('Order not found.');
  }

  private existingLines(order: EditableOrder): OrderLineDto[] {
    return order.lines.map((line) => ({
      dishId: line.dishId,
      quantity: line.quantity,
      combinations: line.combinations.map((combination) => ({
        quantity: combination.quantity,
        options: combination.options.map((option) => ({
          optionGroupId: option.optionGroupId,
          optionId: option.optionId,
          portionSizeId: option.portionSizeId ?? undefined,
        })),
      })),
    }));
  }
}
