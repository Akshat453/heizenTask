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
