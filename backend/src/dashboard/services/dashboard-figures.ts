import { Temporal } from '@js-temporal/polyfill';
import { Prisma } from '../../generated/prisma/client.js';
import { DeliveryDropStatus } from '../../generated/prisma/enums.js';
import {
  isoDateFromDbDate,
  parseIsoDate,
} from '../../business-time/business-time.utils.js';
import { dropOnTime } from '../../dispatch/drop-timing.js';
import type { PrismaService } from '../../prisma/prisma.service.js';

/**
 * Shared dashboard figures. "Meals" are OrderLine quantities (each line's
 * quantity equals the sum of its combination quantities). "Operational" orders
 * are CONFIRMED or DELIVERED: orders cancelled after confirmation stay billable
 * but are not cooked or delivered, so they are not meals.
 */
type Db = Pick<PrismaService, 'deliveryDrop' | '$queryRaw'>;

export const OPERATIONAL_STATUSES = ['CONFIRMED', 'DELIVERED'] as const;

/** Inclusive list of ISO dates between two ISO dates. */
export function isoDateRange(from: string, to: string): string[] {
  const dates: string[] = [];
  for (
    let day = parseIsoDate(from);
    Temporal.PlainDate.compare(day, parseIsoDate(to)) <= 0;
    day = day.add({ days: 1 })
  )
    dates.push(day.toString());
  return dates;
}

export function shiftIsoDate(isoDate: string, days: number): string {
  return parseIsoDate(isoDate).add({ days }).toString();
}

/** Monday..Sunday of the business week containing `isoDate`. */
export function businessWeek(isoDate: string): { from: string; to: string } {
  const day = parseIsoDate(isoDate);
  const monday = day.subtract({ days: day.dayOfWeek - 1 });
  return { from: monday.toString(), to: monday.add({ days: 6 }).toString() };
}

/** Delivered drops whose scheduled time falls in [start, end), and how many were on time. */
export async function deliveredSummary(
  db: Db,
  where: { start: Date; end: Date; driverStaffUserId?: string },
): Promise<{ delivered: number; onTime: number }> {
  const drops = await db.deliveryDrop.findMany({
    where: {
      scheduledDeliveryAt: { gte: where.start, lt: where.end },
      status: DeliveryDropStatus.DELIVERED,
      ...(where.driverStaffUserId && {
        driverStaffUserId: where.driverStaffUserId,
      }),
    },
    select: { deliveredAt: true, scheduledDeliveryAt: true },
  });
  return {
    delivered: drops.length,
    onTime: drops.filter((drop) => dropOnTime(drop) === true).length,
  };
}

/** Operational orders and meals per delivery date, zero-filled for every date in the range. */
export async function mealsByDate(
  db: Db,
  from: string,
  to: string,
): Promise<{ date: string; orders: number; meals: number }[]> {
  const rows = await db.$queryRaw<
    { date: Date; orders: bigint; meals: bigint | null }[]
  >(Prisma.sql`
    SELECT o."deliveryDate" AS date,
           COUNT(DISTINCT o.id) AS orders,
           SUM(l.quantity) AS meals
    FROM "Order" o
    LEFT JOIN "OrderLine" l ON l."orderId" = o.id
    WHERE o."deliveryDate" BETWEEN ${from}::date AND ${to}::date
      AND o.status::text IN (${Prisma.join(OPERATIONAL_STATUSES)})
    GROUP BY o."deliveryDate"`);
  const byDate = new Map(
    rows.map((row) => [
      isoDateFromDbDate(row.date),
      { orders: Number(row.orders), meals: Number(row.meals ?? 0) },
    ]),
  );
  return isoDateRange(from, to).map((date) => ({
    date,
    ...(byDate.get(date) ?? { orders: 0, meals: 0 }),
  }));
}

/** Top companies by operational meals for delivery dates in [from, to]. */
export async function topCompaniesByMeals(
  db: Db,
  from: string,
  to: string,
  limit = 5,
): Promise<
  { companyId: string; name: string; meals: number; orders: number }[]
> {
  const rows = await db.$queryRaw<
    { companyId: string; name: string; meals: bigint | null; orders: bigint }[]
  >(Prisma.sql`
    SELECT c.id AS "companyId", c.name,
           SUM(l.quantity) AS meals,
           COUNT(DISTINCT o.id) AS orders
    FROM "Order" o
    JOIN "Company" c ON c.id = o."companyId"
    LEFT JOIN "OrderLine" l ON l."orderId" = o.id
    WHERE o."deliveryDate" BETWEEN ${from}::date AND ${to}::date
      AND o.status::text IN (${Prisma.join(OPERATIONAL_STATUSES)})
    GROUP BY c.id, c.name
    ORDER BY meals DESC NULLS LAST, c.name ASC
    LIMIT ${limit}`);
  return rows.map((row) => ({
    companyId: row.companyId,
    name: row.name,
    meals: Number(row.meals ?? 0),
    orders: Number(row.orders),
  }));
}
