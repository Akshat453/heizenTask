import type { DispatchDrop, OrderListItem } from "@/lib/api";

/**
 * Presentation-only shaping of the day's drops and confirmed orders. Statuses,
 * onTime and plannedDispatchReadyAt come from the API; nothing is reclassified.
 */

export const NO_DRIVER = "none";

export function addressLine(drop: DispatchDrop): string {
  return [drop.addressLine1Snapshot, drop.addressLine2Snapshot, drop.addressCitySnapshot, drop.addressPostalCodeSnapshot].filter(Boolean).join(", ");
}

/** "4 orders · 23 meals" */
export function dropSize(drop: { _count: { orders: number }; meals: number }): string {
  const orders = drop._count.orders;
  return `${orders} order${orders === 1 ? "" : "s"} · ${drop.meals} meal${drop.meals === 1 ? "" : "s"}`;
}

export { packagingText } from "@/lib/format";

export function dropColumns(drops: DispatchDrop[]) {
  const sorted = [...drops].sort((a, b) => a.scheduledDeliveryAt.localeCompare(b.scheduledDeliveryAt));
  return {
    ready: sorted.filter((d) => d.status === "DISPATCH_READY"),
    out: sorted.filter((d) => d.status === "OUT_FOR_DELIVERY"),
    delivered: sorted.filter((d) => d.status === "DELIVERED"),
  };
}

/** Confirmed orders with no drop yet: the kitchen has not finished them. */
export function waitingOrders(orders: OrderListItem[], q: string): OrderListItem[] {
  const needle = q.trim().toLowerCase();
  return orders
    .filter((o) => o.status === "CONFIRMED" && !o.deliveryDropId)
    .filter((o) => !needle || o.company.name.toLowerCase().includes(needle) || o.deliveryAddressLabelSnapshot.toLowerCase().includes(needle))
    .sort((a, b) => a.deliveryAt.localeCompare(b.deliveryAt));
}

export function dispatchTotals(drops: DispatchDrop[], waiting: number) {
  let ready = 0, out = 0, delivered = 0, onTime = 0, noDriver = 0;
  for (const d of drops) {
    if (d.status === "DISPATCH_READY") {
      ready++;
      if (!d.driverStaffUserId) noDriver++;
    } else if (d.status === "OUT_FOR_DELIVERY") out++;
    else {
      delivered++;
      if (d.onTime) onTime++;
    }
  }
  return { drops: drops.length, waiting, ready, out, delivered, onTime, noDriver };
}

/** Why "Mark out for delivery" is unavailable, or null when it can be offered (the server re-checks). */
export function outForDeliveryBlocker(drop: DispatchDrop): string | null {
  if (drop.status !== "DISPATCH_READY") return "Already left the kitchen";
  if (!drop.driverStaffUserId) return "Assign a driver first";
  return null;
}
