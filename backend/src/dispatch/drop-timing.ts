import { calculatePlannedDispatchReadyAt } from '../kitchen/services/kitchen-timing.helper.js';
/**
 * On-time delivery, derived (never stored):
 *   null before delivery; afterwards deliveredAt <= scheduledDeliveryAt.
 * Exact equality is on time; there is no grace period.
 */
export function dropOnTime(drop: {
  deliveredAt: Date | null;
  scheduledDeliveryAt: Date;
}): boolean | null {
  if (!drop.deliveredAt) return null;
  return drop.deliveredAt.getTime() <= drop.scheduledDeliveryAt.getTime();
}

export function withOnTime<
  T extends { deliveredAt: Date | null; scheduledDeliveryAt: Date },
>(drop: T): T & { onTime: boolean | null } {
  return { ...drop, onTime: dropOnTime(drop) };
}

/**
 * When a Drop must leave the Kitchen: its scheduled delivery time minus the
 * longest delivery lead snapshotted on its Orders (the shared planning helper).
 * Grouped Orders normally share one lead; the longest one is the binding one.
 * null for a Drop without Orders.
 */
export function dropPlannedDispatchReadyAt(drop: {
  scheduledDeliveryAt: Date;
  orders: { deliveryLeadMinutesSnapshot: number }[];
}): Date | null {
  if (drop.orders.length === 0) return null;
  const lead = Math.max(
    ...drop.orders.map((order) => order.deliveryLeadMinutesSnapshot),
  );
  return calculatePlannedDispatchReadyAt(drop.scheduledDeliveryAt, lead);
}
