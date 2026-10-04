import type { Prisma } from '../generated/prisma/client.js';

/** Order fields loaded with each Drop (one include, no per-drop queries). */
export const dropOrdersSelect = {
  id: true,
  orderNumber: true,
  packagingNameSnapshot: true,
  deliveryLeadMinutesSnapshot: true,
  employee: { select: { name: true } },
  lines: { select: { quantity: true } },
} satisfies Prisma.OrderSelect;

export type DropOrderRow = Prisma.OrderGetPayload<{
  select: typeof dropOrdersSelect;
}>;

/**
 * Meals = sum of line quantities (each line's quantity equals the sum of its
 * combination quantities). Packaging counts orders per snapshotted packaging name.
 */
export function summarizeDropOrders(orders: DropOrderRow[]) {
  const summaries = orders.map((order) => ({
    id: order.id,
    orderNumber: order.orderNumber,
    employeeName: order.employee.name,
    packagingName: order.packagingNameSnapshot,
    meals: order.lines.reduce((sum, line) => sum + line.quantity, 0),
  }));
  const packaging = new Map<string, number>();
  for (const order of summaries)
    packaging.set(
      order.packagingName,
      (packaging.get(order.packagingName) ?? 0) + 1,
    );
  return {
    orders: summaries.sort((a, b) =>
      a.orderNumber.localeCompare(b.orderNumber),
    ),
    meals: summaries.reduce((sum, order) => sum + order.meals, 0),
    packaging: [...packaging.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)),
  };
}
