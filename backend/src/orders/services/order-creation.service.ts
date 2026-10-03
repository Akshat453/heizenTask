import { Injectable, InternalServerErrorException, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { PriceResolverService } from '../../pricing/price-resolver.service.js';
import { OrderValidationService } from './order-validation.service.js';
import { CreateOrderDto, UpdateOrderDto, OrderLineDto } from '../dto/order.dto.js';
import { OrderStatus, OrderEventType } from '../../generated/prisma/enums.js';
import { randomBytes } from 'crypto';

@Injectable()
export class OrderCreationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly validation: OrderValidationService,
    private readonly priceResolver: PriceResolverService,
  ) {}

  private generateOrderNumber(): string {
    return `ORD-${new Date().getFullYear()}${(new Date().getMonth() + 1).toString().padStart(2, '0')}-${randomBytes(4).toString('hex').toUpperCase()}`;
  }

  async create(dto: CreateOrderDto, actorStaffUserId: string) {
    // 1. Validate the structure
    const { employee, company, address } = await this.validation.validateOrderGraph(
      dto.employeeId,
      dto.deliveryDate,
      dto.lines,
    );

    // 2. Packaging & Times
    const packaging = await this.prisma.packagingType.findUnique({ where: { id: company.defaultPackagingTypeId } });
    if (!packaging) throw new InternalServerErrorException('Default packaging not found');

    const deliveryTimeParts = company.defaultDeliveryTime; 
    const deliveryAt = new Date(dto.deliveryDate);
    deliveryAt.setUTCHours(deliveryTimeParts.getUTCHours(), deliveryTimeParts.getUTCMinutes(), 0, 0);

    // 3. Resolve Pricing & Snapshots
    const tierId = await this.priceResolver.resolveTierForEmployee(employee.id);
    
    // We need dish and option names for snapshots.
    const dishIds = dto.lines.map(l => l.dishId);
    const dishes = await this.prisma.dish.findMany({ where: { id: { in: dishIds } } });
    const dishMap = new Map(dishes.map(d => [d.id, d]));

    let totalCents = 0;
    
    // Process line items
    const createLinesData: any[] = [];
    for (const line of dto.lines) {
      const dish = dishMap.get(line.dishId)!;
      const resolvedDishPrice = await this.priceResolver.resolveDishPrice(tierId, dish.id);
      if (resolvedDishPrice.priceCents === null) {
        throw new BadRequestException(`Dish ${dish.id} is unavailable or unpriced for this employee.`);
      }
      const dishPriceCents = resolvedDishPrice.priceCents;

      let lineTotalCents = 0;
      let lineTotalQty = 0;
      const createCombinationsData: any[] = [];

      for (const combo of line.combinations) {
        let comboUnitPriceCents = dishPriceCents;
        lineTotalQty += combo.quantity;
        
        const createOptionsData = [];
        
        for (const opt of combo.options) {
          const optionEntity = await this.prisma.option.findUnique({ where: { id: opt.optionId } });
          const optionGroupEntity = await this.prisma.optionGroup.findUnique({ where: { id: opt.optionGroupId } });
          let portionEntity = null;
          let portionExtraCents = 0;

          if (opt.portionSizeId) {
            portionEntity = await this.prisma.portionSize.findUnique({ where: { id: opt.portionSizeId } });
            const ogp = await this.prisma.optionGroupPortion.findUnique({
              where: { optionGroupId_portionSizeId: { optionGroupId: opt.optionGroupId, portionSizeId: opt.portionSizeId } }
            });
            portionExtraCents = ogp?.extraChargeCents ?? 0;
          }

          const resolvedOptPrice = await this.priceResolver.resolveOptionPrice(tierId, opt.optionId);
          if (resolvedOptPrice.priceCents === null) {
            throw new BadRequestException(`Option ${opt.optionId} is unavailable or unpriced.`);
          }
          const optPriceCents = resolvedOptPrice.priceCents;

          comboUnitPriceCents += optPriceCents + portionExtraCents;
          
          createOptionsData.push({
            optionGroupId: opt.optionGroupId,
            optionId: opt.optionId,
            portionSizeId: opt.portionSizeId,
            optionGroupNameSnapshot: optionGroupEntity!.name,
            optionNameSnapshot: optionEntity!.name,
            portionNameSnapshot: portionEntity?.name ?? null,
            optionPriceCents: optPriceCents,
            portionExtraCents,
          });
        }
        
        const comboTotalCents = comboUnitPriceCents * combo.quantity;
        lineTotalCents += comboTotalCents;
        
        createCombinationsData.push({
          quantity: combo.quantity,
          unitPriceCents: comboUnitPriceCents,
          totalCents: comboTotalCents,
          options: {
            create: createOptionsData,
          }
        });
      }

      totalCents += lineTotalCents;

      createLinesData.push({
        dishId: dish.id,
        dishNameSnapshot: dish.name,
        dishSkuSnapshot: dish.sku,
        quantity: lineTotalQty,
        dishUnitPriceCents: dishPriceCents,
        lineTotalCents,
        combinations: {
          create: createCombinationsData,
        }
      });
    }

    const initialStatus = dto.placeOrder ? OrderStatus.PLACED : OrderStatus.DRAFT;

    // 4. Create the Order
    const order = await this.prisma.order.create({
      data: {
        orderNumber: this.generateOrderNumber(),
        employeeId: employee.id,
        companyId: company.id,
        status: initialStatus,
        deliveryDate: new Date(dto.deliveryDate),
        deliveryAt,
        deliveryAddressId: address.id,
        deliveryAddressLabelSnapshot: address.label,
        deliveryAddressLine1Snapshot: address.line1,
        deliveryAddressLine2Snapshot: address.line2,
        deliveryAddressCitySnapshot: address.city,
        deliveryAddressRegionSnapshot: address.region,
        deliveryAddressPostalCodeSnapshot: address.postalCode,
        deliveryAddressCountrySnapshot: address.country,
        packagingTypeId: packaging.id,
        packagingNameSnapshot: packaging.name,
        deliveryLeadMinutesSnapshot: company.deliveryLeadMinutes,
        subtotalCents: totalCents,
        totalCents,
        billableTotalCents: null, // Frozen only on CONFIRMED
        placedAt: dto.placeOrder ? new Date() : null,
        createdByStaffUserId: actorStaffUserId,
        lines: {
          create: createLinesData,
        },
        events: {
          create: [
            {
              type: OrderEventType.ORDER_CREATED,
              actorStaffUserId,
              message: 'Order created',
            },
            ...(dto.placeOrder ? [{
              type: OrderEventType.ORDER_PLACED,
              actorStaffUserId,
              message: 'Order placed directly on creation',
            }] : []),
          ],
        },
      },
    });

    return order;
  }

  async update(orderId: string, dto: UpdateOrderDto, actorStaffUserId: string) {
    const existingOrder = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        lines: {
          include: {
            combinations: {
              include: { options: true }
            }
          }
        }
      }
    });

    if (!existingOrder) throw new NotFoundException('Order not found');
    if (existingOrder.status !== OrderStatus.DRAFT && existingOrder.status !== OrderStatus.PLACED) {
      throw new ConflictException(`Cannot edit order in status ${existingOrder.status}`);
    }

    // Convert existing lines to DTO format if lines not provided
    let linesDto: OrderLineDto[];
    if (dto.lines) {
      linesDto = dto.lines;
    } else {
      linesDto = existingOrder.lines.map(l => ({
        dishId: l.dishId,
        combinations: l.combinations.map(c => ({
          quantity: c.quantity,
          options: c.options.map(o => ({
            optionGroupId: o.optionGroupId,
            optionId: o.optionId,
            portionSizeId: o.portionSizeId ?? undefined,
          }))
        }))
      }));
    }

    const { employee, company, address } = await this.validation.validateOrderGraph(
      existingOrder.employeeId,
      existingOrder.deliveryDate.toISOString().split('T')[0]!,
      linesDto,
    );

    const packaging = await this.prisma.packagingType.findUnique({ where: { id: company.defaultPackagingTypeId } });
    if (!packaging) throw new InternalServerErrorException('Default packaging not found');

    const deliveryTimeParts = company.defaultDeliveryTime; 
    const deliveryAt = existingOrder.deliveryDate;
    deliveryAt.setUTCHours(deliveryTimeParts.getUTCHours(), deliveryTimeParts.getUTCMinutes(), 0, 0);

    const tierId = await this.priceResolver.resolveTierForEmployee(employee.id);
    
    const dishIds = linesDto.map(l => l.dishId);
    const dishes = await this.prisma.dish.findMany({ where: { id: { in: dishIds } } });
    const dishMap = new Map(dishes.map(d => [d.id, d]));

    let totalCents = 0;
    
    const createLinesData: any[] = [];
    for (const line of linesDto) {
      const dish = dishMap.get(line.dishId)!;
      const resolvedDishPrice = await this.priceResolver.resolveDishPrice(tierId, dish.id);
      if (resolvedDishPrice.priceCents === null) {
        throw new BadRequestException(`Dish ${dish.id} is unavailable or unpriced for this employee.`);
      }
      const dishPriceCents = resolvedDishPrice.priceCents;

      let lineTotalCents = 0;
      let lineTotalQty = 0;
      const createCombinationsData: any[] = [];

      for (const combo of line.combinations) {
        let comboUnitPriceCents = dishPriceCents;
        lineTotalQty += combo.quantity;
        
        const createOptionsData = [];
        for (const opt of combo.options) {
          const optionEntity = await this.prisma.option.findUnique({ where: { id: opt.optionId } });
          const optionGroupEntity = await this.prisma.optionGroup.findUnique({ where: { id: opt.optionGroupId } });
          let portionEntity = null;
          let portionExtraCents = 0;

          if (opt.portionSizeId) {
            portionEntity = await this.prisma.portionSize.findUnique({ where: { id: opt.portionSizeId } });
            const ogp = await this.prisma.optionGroupPortion.findUnique({
              where: { optionGroupId_portionSizeId: { optionGroupId: opt.optionGroupId, portionSizeId: opt.portionSizeId } }
            });
            portionExtraCents = ogp?.extraChargeCents ?? 0;
          }

          const resolvedOptPrice = await this.priceResolver.resolveOptionPrice(tierId, opt.optionId);
          if (resolvedOptPrice.priceCents === null) {
            throw new BadRequestException(`Option ${opt.optionId} is unavailable or unpriced.`);
          }
          const optPriceCents = resolvedOptPrice.priceCents;

          comboUnitPriceCents += optPriceCents + portionExtraCents;
          
          createOptionsData.push({
            optionGroupId: opt.optionGroupId,
            optionId: opt.optionId,
            portionSizeId: opt.portionSizeId,
            optionGroupNameSnapshot: optionGroupEntity!.name,
            optionNameSnapshot: optionEntity!.name,
            portionNameSnapshot: portionEntity?.name ?? null,
            optionPriceCents: optPriceCents,
            portionExtraCents,
          });
        }
        
        const comboTotalCents = comboUnitPriceCents * combo.quantity;
        lineTotalCents += comboTotalCents;
        
        createCombinationsData.push({
          quantity: combo.quantity,
          unitPriceCents: comboUnitPriceCents,
          totalCents: comboTotalCents,
          options: { create: createOptionsData }
        });
      }

      totalCents += lineTotalCents;

      createLinesData.push({
        dishId: dish.id,
        dishNameSnapshot: dish.name,
        dishSkuSnapshot: dish.sku,
        quantity: lineTotalQty,
        dishUnitPriceCents: dishPriceCents,
        lineTotalCents,
        combinations: { create: createCombinationsData }
      });
    }

    const placeNow = dto.placeOrder === true || (dto.placeOrder !== false && existingOrder.status === OrderStatus.PLACED);
    const newStatus = placeNow ? OrderStatus.PLACED : OrderStatus.DRAFT;
    const wasDraft = existingOrder.status === OrderStatus.DRAFT;
    
    const events: any[] = [{ type: OrderEventType.ORDER_CREATED, actorStaffUserId, message: 'Order edited' }];
    if (placeNow && wasDraft) {
      events.push({ type: OrderEventType.ORDER_PLACED, actorStaffUserId, message: 'Order placed' });
    }

    // Delete existing graph and replace with new
    return this.prisma.$transaction(async (tx) => {
      await tx.orderLine.deleteMany({ where: { orderId } });

      const order = await tx.order.update({
        where: { id: orderId },
        data: {
          status: newStatus,
          deliveryAt,
          deliveryAddressId: address.id,
          deliveryAddressLabelSnapshot: address.label,
          deliveryAddressLine1Snapshot: address.line1,
          deliveryAddressLine2Snapshot: address.line2,
          deliveryAddressCitySnapshot: address.city,
          deliveryAddressRegionSnapshot: address.region,
          deliveryAddressPostalCodeSnapshot: address.postalCode,
          deliveryAddressCountrySnapshot: address.country,
          packagingTypeId: packaging.id,
          packagingNameSnapshot: packaging.name,
          deliveryLeadMinutesSnapshot: company.deliveryLeadMinutes,
          subtotalCents: totalCents,
          totalCents,
          placedAt: (placeNow && wasDraft) ? new Date() : existingOrder.placedAt,
          lines: { create: createLinesData },
          events: { create: events },
        },
      });

      return order;
    });
  }
}

