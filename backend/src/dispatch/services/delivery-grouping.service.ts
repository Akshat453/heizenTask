import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { DeliveryDropStatus, OrderStatus, OrderEventType } from '../../generated/prisma/enums.js';
import { Prisma } from '../../generated/prisma/client.js';

@Injectable()
export class DeliveryGroupingService {
  private readonly logger = new Logger(DeliveryGroupingService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generates a deterministic canonical grouping key for an Order.
   */
  getCanonicalKey(order: {
    companyId: string;
    deliveryAddressId: string | null;
    deliveryAddressLine1Snapshot: string;
    deliveryAddressCitySnapshot: string;
    deliveryAddressPostalCodeSnapshot: string | null;
    deliveryAddressCountrySnapshot: string;
    deliveryAt: Date;
  }): string {
    const timeStr = order.deliveryAt.toISOString();
    
    // Prefer stable ID if present
    if (order.deliveryAddressId) {
      return `${order.companyId}|${order.deliveryAddressId}|${timeStr}`;
    }

    // Otherwise use normalized snapshot
    const normalize = (s: string | null | undefined) => (s ? s.trim().toLowerCase().replace(/\s+/g, ' ') : '');
    
    const addr = [
      normalize(order.deliveryAddressLine1Snapshot),
      normalize(order.deliveryAddressCitySnapshot),
      normalize(order.deliveryAddressPostalCodeSnapshot),
      normalize(order.deliveryAddressCountrySnapshot),
    ].join('|');

    return `${order.companyId}|${addr}|${timeStr}`;
  }

  /**
   * Attempts to group an Order into a DeliveryDrop.
   * Can be called independently, or as part of a larger transaction (e.g. overrideDelivery).
   */
  async ensureReadyDropForOrder(orderId: string, providedTx?: Prisma.TransactionClient) {
    const execute = async (tx: Prisma.TransactionClient) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        select: {
          companyId: true,
          deliveryAddressId: true,
          deliveryAddressLine1Snapshot: true,
          deliveryAddressCitySnapshot: true,
          deliveryAddressPostalCodeSnapshot: true,
          deliveryAddressCountrySnapshot: true,
          deliveryAt: true,
          deliveryAddressLabelSnapshot: true,
          deliveryAddressLine2Snapshot: true,
          deliveryAddressRegionSnapshot: true,
        },
      });

      if (!order) return;

      const canonicalKey = this.getCanonicalKey(order);
      await this.reconcileGroup(canonicalKey, tx, order);
    };

    if (providedTx) {
      await execute(providedTx);
    } else {
      await this.prisma.$transaction(execute);
    }
  }

  /**
   * Reconciles a specific grouping key.
   * Locks the key, finds all CONFIRMED unattached/DISPATCH_READY orders,
   * checks if they are all kitchen-ready, and creates/attaches to a Drop.
   */
  async reconcileGroup(
    canonicalKey: string,
    tx: Prisma.TransactionClient,
    sampleOrder?: any, // Pass an order object to avoid re-querying for snapshot fields if we need to create a Drop
  ) {
    // 1. Acquire advisory lock on the hash of the canonical key
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${canonicalKey}, 0))`;

    // 2. We need to find all orders that logically belong to this canonical key.
    // However, we don't store the canonical key in the DB.
    // Since we know the companyId and deliveryAt from the key (or from sampleOrder if provided),
    // we can query candidate orders and filter them in memory, or use the sampleOrder fields to query.
    
    let baseCompanyId = '';
    let baseDeliveryAt: Date;
    let baseAddressId: string | null = null;
    let baseAddrLine1 = '';
    let baseAddrCity = '';
    let baseAddrPostal = '';
    let baseAddrCountry = '';

    if (sampleOrder) {
      baseCompanyId = sampleOrder.companyId;
      baseDeliveryAt = sampleOrder.deliveryAt;
      baseAddressId = sampleOrder.deliveryAddressId;
      baseAddrLine1 = sampleOrder.deliveryAddressLine1Snapshot;
      baseAddrCity = sampleOrder.deliveryAddressCitySnapshot;
      baseAddrPostal = sampleOrder.deliveryAddressPostalCodeSnapshot;
      baseAddrCountry = sampleOrder.deliveryAddressCountrySnapshot;
    } else {
      // Reconciling blindly from a key (e.g. from reconcileAll). We parse it.
      const parts = canonicalKey.split('|');
      baseCompanyId = parts[0];
      baseDeliveryAt = new Date(parts[parts.length - 1]);
      // For a full system reconcile, it's easier to just query all candidate orders for the company/time
      // and match the canonical key.
    }

    const candidateOrders = await tx.order.findMany({
      where: {
        companyId: baseCompanyId,
        deliveryAt: baseDeliveryAt,
        status: OrderStatus.CONFIRMED,
      },
      include: { deliveryDrop: true },
    });

    // Filter to only orders matching this exact canonical key
    const matchingOrders = candidateOrders.filter((o) => this.getCanonicalKey(o) === canonicalKey);
    if (matchingOrders.length === 0) return;

    // Filter out orders already attached to immutable drops (OUT_FOR_DELIVERY, DELIVERED)
    const eligibleOrders = matchingOrders.filter((o) => {
      if (!o.deliveryDropId) return true;
      return o.deliveryDrop?.status === DeliveryDropStatus.DISPATCH_READY;
    });

    if (eligibleOrders.length === 0) return;

    // Check if ALL eligible orders are Kitchen Ready
    const allReady = eligibleOrders.every((o) => o.kitchenReadyAt !== null);
    if (!allReady) {
      // Not ready. Do nothing. They will remain without a drop.
      return;
    }

    // All eligible orders are ready. They need to be in a DISPATCH_READY drop.
    // Find if there is an existing DISPATCH_READY drop for any of these orders.
    let existingDropId = eligibleOrders.find((o) => o.deliveryDropId)?.deliveryDropId;

    if (!existingDropId) {
      // Create a new DISPATCH_READY drop
      const firstOrder = eligibleOrders[0];
      
      // Resolve default driver
      const company = await tx.company.findUnique({
        where: { id: baseCompanyId },
        select: { defaultDriverStaffUserId: true },
      });
      
      let driverIdToAssign: string | null = null;
      if (company?.defaultDriverStaffUserId) {
        // Validate driver
        const driver = await tx.staffUser.findUnique({
          where: { id: company.defaultDriverStaffUserId },
          include: { role: { include: { permissions: { include: { permission: true } } } } },
        });
        
        if (driver?.isActive) {
          const hasDeliverPerm = driver.role.permissions.some((rp) => rp.permission.key === 'driver.own_drops.deliver');
          if (hasDeliverPerm) {
            driverIdToAssign = driver.id;
          }
        }
      }

      const newDrop = await tx.deliveryDrop.create({
        data: {
          companyId: baseCompanyId,
          scheduledDeliveryAt: baseDeliveryAt,
          addressLabelSnapshot: firstOrder.deliveryAddressLabelSnapshot,
          addressLine1Snapshot: firstOrder.deliveryAddressLine1Snapshot,
          addressLine2Snapshot: firstOrder.deliveryAddressLine2Snapshot,
          addressCitySnapshot: firstOrder.deliveryAddressCitySnapshot,
          addressRegionSnapshot: firstOrder.deliveryAddressRegionSnapshot,
          addressPostalCodeSnapshot: firstOrder.deliveryAddressPostalCodeSnapshot,
          addressCountrySnapshot: firstOrder.deliveryAddressCountrySnapshot,
          status: DeliveryDropStatus.DISPATCH_READY,
          dispatchReadyAt: new Date(),
          driverStaffUserId: driverIdToAssign,
        }
      });
      existingDropId = newDrop.id;
    }

    // Attach all unattached eligible orders to this drop
    const unattachedIds = eligibleOrders.filter((o) => o.deliveryDropId !== existingDropId).map((o) => o.id);
    if (unattachedIds.length > 0) {
      await tx.order.updateMany({
        where: { id: { in: unattachedIds } },
        data: { deliveryDropId: existingDropId },
      });

      // Record events
      const now = new Date();
      await tx.orderEvent.createMany({
        data: unattachedIds.map((id) => ({
          orderId: id,
          type: OrderEventType.DISPATCH_READY,
          occurredAt: now,
          message: 'Order attached to Delivery Drop (Dispatch Ready)',
        })),
      });
    }
  }

  /**
   * Idempotent failure recovery / manual grouping trigger.
   * Finds all CONFIRMED orders that are kitchenReadyAt != null but have no DeliveryDrop,
   * and processes their grouping keys.
   */
  async reconcileAll() {
    const unattachedReadyOrders = await this.prisma.order.findMany({
      where: {
        status: OrderStatus.CONFIRMED,
        kitchenReadyAt: { not: null },
        deliveryDropId: null,
      },
      select: {
        id: true,
        companyId: true,
        deliveryAddressId: true,
        deliveryAddressLine1Snapshot: true,
        deliveryAddressCitySnapshot: true,
        deliveryAddressPostalCodeSnapshot: true,
        deliveryAddressCountrySnapshot: true,
        deliveryAt: true,
        deliveryAddressLabelSnapshot: true,
        deliveryAddressLine2Snapshot: true,
        deliveryAddressRegionSnapshot: true,
      }
    });

    // Extract unique canonical keys and one sample order for each
    const keysMap = new Map<string, any>();
    for (const order of unattachedReadyOrders) {
      const key = this.getCanonicalKey(order as any);
      if (!keysMap.has(key)) {
        keysMap.set(key, order);
      }
    }

    let processedCount = 0;
    for (const [key, order] of keysMap.entries()) {
      await this.prisma.$transaction(async (tx) => {
        await this.reconcileGroup(key, tx, order);
      });
      processedCount++;
    }

    return { processedGroups: processedCount, unattachedReadyOrdersFound: unattachedReadyOrders.length };
  }
}
