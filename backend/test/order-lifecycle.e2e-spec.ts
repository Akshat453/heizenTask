import { ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Temporal } from '@js-temporal/polyfill';
import pg from 'pg';
import { AppModule } from '../src/app.module.js';
import { BusinessTimeService } from '../src/business-time/business-time.service.js';
import { businessLocalDateTimeToInstant } from '../src/business-time/business-time.utils.js';
import { DeliveryGroupingService } from '../src/dispatch/services/delivery-grouping.service.js';
import {
  DayOfWeek,
  DeliveryDropStatus,
  OrderEventType,
  OrderStatus,
} from '../src/generated/prisma/enums.js';
import { KitchenLifecycleService } from '../src/kitchen/services/kitchen-lifecycle.service.js';
import { KitchenQueryService } from '../src/kitchen/services/kitchen-query.service.js';
import type { OrderLineDto } from '../src/orders/dto/order.dto.js';
import { CutoffService } from '../src/orders/services/cutoff.service.js';
import { OrderCreationService } from '../src/orders/services/order-creation.service.js';
import { OrderLifecycleService } from '../src/orders/services/order-lifecycle.service.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { cleanupTestData, testId, testName } from './support/fixtures.js';
import {
  createOrderingFixture,
  ensurePlatformSettings,
  type OrderingFixture,
} from './support/ordering-fixture.js';

const TZ = 'Asia/Kolkata';
const AFTER_CUTOFF = Temporal.Instant.from('2100-01-01T00:00:00Z');
const toInstant = (date: Date) =>
  Temporal.Instant.fromEpochMilliseconds(date.getTime());
const plusDays = (date: string, days: number) =>
  Temporal.PlainDate.from(date).add({ days }).toString();
/** First date on/after `from` with the given ISO weekday (1 = Monday). */
const nextWeekday = (from: string, isoDay: number) => {
  let date = Temporal.PlainDate.from(from);
  while (date.dayOfWeek !== isoDay) date = date.add({ days: 1 });
  return date.toString();
};

// Each scenario builds confirmed, Kitchen-ready Orders through the real services; on a
// remote test database (~250ms RTT) multi-order scenarios exceed the default 60s.
describe(
  'Order lifecycle, cutoff, cancellation and override (PostgreSQL)',
  { timeout: 300_000 },
  () => {
    let moduleRef: TestingModule;
    let prisma: PrismaService;
    let orders: OrderCreationService;
    let lifecycle: OrderLifecycleService;
    let cutoff: CutoffService;
    let kitchen: KitchenLifecycleService;
    let grouping: DeliveryGroupingService;
    let businessTime: BusinessTimeService;
    let fx: OrderingFixture;
    let restoreSettings: () => Promise<void>;

    const line = (paneerQty = 2, tofuQty = 1): OrderLineDto => ({
      dishId: fx.bowlId,
      quantity: paneerQty + tofuQty,
      combinations: [
        {
          quantity: paneerQty,
          options: [
            { optionGroupId: fx.proteinGroupId, optionId: fx.paneerId },
            {
              optionGroupId: fx.riceGroupId,
              optionId: fx.riceId,
              portionSizeId: fx.smallId,
            },
          ],
        },
        {
          quantity: tofuQty,
          options: [{ optionGroupId: fx.proteinGroupId, optionId: fx.tofuId }],
        },
      ],
    });
    const newOrder = (deliveryDate: string, placeOrder = true) =>
      orders.create(
        {
          employeeId: fx.employeeId,
          deliveryDate,
          placeOrder,
          lines: [line()],
        },
        fx.staffId,
      );
    const runCutoffAt = async (deliveryDate: string, now: Temporal.Instant) => {
      const spy = vi.spyOn(businessTime, 'now').mockReturnValue(now);
      try {
        return await cutoff.processManual({ deliveryDate }, fx.staffId);
      } finally {
        spy.mockRestore();
      }
    };
    /** PLACED → CONFIRMED (cutoff) → kitchen-ready → DISPATCH_READY Drop. */
    const readyOrders = async (deliveryDate: string, count: number) => {
      const created = [];
      for (let index = 0; index < count; index++)
        created.push(await newOrder(deliveryDate));
      await runCutoffAt(deliveryDate, AFTER_CUTOFF);
      for (const order of created)
        await kitchen.forceCompleteOrder(order.id, fx.staffId);
      return Promise.all(
        created.map(({ id }) =>
          prisma.order.findUniqueOrThrow({ where: { id } }),
        ),
      );
    };
    const events = (orderId: string, type: OrderEventType) =>
      prisma.orderEvent.count({ where: { orderId, type } });
    const settingsCutoff = (date: string) =>
      toInstant(businessLocalDateTimeToInstant(date, '16:00', TZ));

    beforeAll(async () => {
      moduleRef = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();
      prisma = moduleRef.get(PrismaService);
      orders = moduleRef.get(OrderCreationService);
      lifecycle = moduleRef.get(OrderLifecycleService);
      cutoff = moduleRef.get(CutoffService);
      kitchen = moduleRef.get(KitchenLifecycleService);
      grouping = moduleRef.get(DeliveryGroupingService);
      businessTime = moduleRef.get(BusinessTimeService);
      await cleanupTestData(prisma);
      restoreSettings = await ensurePlatformSettings(prisma);
      fx = await createOrderingFixture(prisma, 'LIFECYCLE');
    });

    afterEach(() => vi.restoreAllMocks());

    afterAll(async () => {
      try {
        await cleanupTestData(prisma);
      } finally {
        await restoreSettings();
        await moduleRef.close();
      }
    });

    describe('cutoff', () => {
      it('confirms exactly at cutoffAt (not 1 ms before), freezing the locked total with one PrepUnit per combination', async () => {
        const date = '2099-05-06';
        const order = await newOrder(date);
        const draft = await newOrder(date, false);
        const cutoffAt = settingsCutoff(plusDays(date, -1)); // count 1, every day a Kitchen day

        const early = await runCutoffAt(
          date,
          cutoffAt.subtract({ milliseconds: 1 }),
        );
        expect(early).toMatchObject({
          processedCount: 0,
          skippedCount: 2,
          failures: [],
        });

        const summary = await runCutoffAt(date, cutoffAt);
        expect(summary).toEqual({
          processedCount: 2,
          cancelledCount: 1,
          confirmedCount: 1,
          skippedCount: 0,
          failures: [],
        });

        const confirmed = await prisma.order.findUniqueOrThrow({
          where: { id: order.id },
          include: {
            prepUnits: true,
            lines: { include: { combinations: true } },
          },
        });
        expect(confirmed.status).toBe(OrderStatus.CONFIRMED);
        expect(confirmed.billableTotalCents).toBe(confirmed.totalCents);
        const combinations = confirmed.lines.flatMap(
          ({ combinations: list }) => list,
        );
        expect(confirmed.prepUnits).toHaveLength(combinations.length); // 2 combinations (qty 2 + qty 1) → 2 PrepUnits
        expect(
          confirmed.prepUnits
            .map(({ quantity }) => quantity)
            .sort((a, b) => a - b),
        ).toEqual([1, 2]);
        expect(
          confirmed.prepUnits.every(
            ({ stationNameSnapshot, stationId }) =>
              stationNameSnapshot === 'Unassigned' && stationId === null,
          ),
        ).toBe(true);
        expect(
          (await prisma.order.findUniqueOrThrow({ where: { id: draft.id } }))
            .status,
        ).toBe(OrderStatus.CANCELLED);
        expect(await events(draft.id, OrderEventType.ORDER_CANCELLED)).toBe(1);

        // Re-running is a no-op: no duplicate PrepUnits or events.
        expect(await runCutoffAt(date, AFTER_CUTOFF)).toEqual({
          processedCount: 0,
          cancelledCount: 0,
          confirmedCount: 0,
          skippedCount: 0,
          failures: [],
        });
        expect(
          await prisma.prepUnit.count({ where: { orderId: order.id } }),
        ).toBe(2);
        expect(await events(order.id, OrderEventType.ORDER_CONFIRMED)).toBe(1);
      });

      it('snapshots the actual Kitchen station name when the Dish has one', async () => {
        const stationId = testId('LIFECYCLE:station');
        await prisma.kitchenStation.create({
          data: {
            id: stationId,
            name: testName('LIFECYCLE-GRILL'),
            displayOrder: 900,
          },
        });
        await prisma.dish.update({
          where: { id: fx.bowlId },
          data: { stationId },
        });
        try {
          const date = '2099-05-07';
          const order = await newOrder(date);
          await runCutoffAt(date, AFTER_CUTOFF);
          const prepUnits = await prisma.prepUnit.findMany({
            where: { orderId: order.id },
          });
          expect(
            prepUnits.every(
              (unit) =>
                unit.stationId === stationId &&
                unit.stationNameSnapshot === 'TEST-LIFECYCLE-GRILL',
            ),
          ).toBe(true);
        } finally {
          await prisma.dish.update({
            where: { id: fx.bowlId },
            data: { stationId: null },
          });
        }
      });

      it('honours zero working days, Kitchen working days and Kitchen holidays', async () => {
        const settings = await prisma.platformSettings.findUniqueOrThrow({
          where: { id: 1 },
        });
        const kitchenDays = (await prisma.kitchenWorkingDay.findMany()).map(
          ({ dayOfWeek }) => dayOfWeek,
        );
        const holidayId = testId('LIFECYCLE:holiday');
        try {
          // Zero working days → cutoff is the delivery date itself at 16:00.
          await prisma.platformSettings.update({
            where: { id: 1 },
            data: { cutoffWorkingDayCount: 0 },
          });
          const zeroDate = '2099-05-08';
          await newOrder(zeroDate);
          expect(
            (
              await runCutoffAt(
                zeroDate,
                settingsCutoff(zeroDate).subtract({ minutes: 1 }),
              )
            ).confirmedCount,
          ).toBe(0);
          expect(
            (await runCutoffAt(zeroDate, settingsCutoff(zeroDate)))
              .confirmedCount,
          ).toBe(1);

          // Kitchen works Mon–Fri: a Monday delivery's cutoff is the previous Friday 16:00.
          await prisma.platformSettings.update({
            where: { id: 1 },
            data: { cutoffWorkingDayCount: 1 },
          });
          await prisma.kitchenWorkingDay.deleteMany({});
          await prisma.kitchenWorkingDay.createMany({
            data: [
              DayOfWeek.MONDAY,
              DayOfWeek.TUESDAY,
              DayOfWeek.WEDNESDAY,
              DayOfWeek.THURSDAY,
              DayOfWeek.FRIDAY,
            ].map((dayOfWeek) => ({ dayOfWeek })),
          });
          const monday = nextWeekday('2099-05-11', 1);
          await newOrder(monday);
          const friday = plusDays(monday, -3);
          expect(
            (
              await runCutoffAt(
                monday,
                settingsCutoff(friday).subtract({ minutes: 1 }),
              )
            ).confirmedCount,
          ).toBe(0);
          expect(
            (await runCutoffAt(monday, settingsCutoff(friday))).confirmedCount,
          ).toBe(1);

          // A Kitchen holiday on Thursday pushes a Friday delivery's cutoff back to Wednesday.
          const fridayDelivery = nextWeekday(plusDays(monday, 1), 5);
          await prisma.kitchenHoliday.create({
            data: {
              id: holidayId,
              date: new Date(`${plusDays(fridayDelivery, -1)}T00:00:00.000Z`),
              name: testName('HOLIDAY'),
            },
          });
          await newOrder(fridayDelivery);
          const wednesday = plusDays(fridayDelivery, -2);
          expect(
            (
              await runCutoffAt(
                fridayDelivery,
                settingsCutoff(wednesday).subtract({ minutes: 1 }),
              )
            ).confirmedCount,
          ).toBe(0);
          expect(
            (await runCutoffAt(fridayDelivery, settingsCutoff(wednesday)))
              .confirmedCount,
          ).toBe(1);
        } finally {
          await prisma.kitchenHoliday.deleteMany({ where: { id: holidayId } });
          await prisma.kitchenWorkingDay.deleteMany({});
          await prisma.kitchenWorkingDay.createMany({
            data: kitchenDays.map((dayOfWeek) => ({ dayOfWeek })),
          });
          await prisma.platformSettings.update({
            where: { id: 1 },
            data: { cutoffWorkingDayCount: settings.cutoffWorkingDayCount },
          });
        }
      });
    });

    describe('confirmed cancellation', () => {
      it('keeps billability, keeps PrepUnits, leaves Kitchen work, and removes an emptied mutable Drop', async () => {
        const date = '2099-06-01';
        const [order] = await readyOrders(date, 1);
        expect(order!.deliveryDropId).not.toBeNull();
        const dropId = order!.deliveryDropId!;

        await lifecycle.cancel(order!.id, fx.staffId);
        const cancelled = await prisma.order.findUniqueOrThrow({
          where: { id: order!.id },
        });
        expect(cancelled).toMatchObject({
          status: OrderStatus.CANCELLED,
          billableTotalCents: order!.billableTotalCents,
          deliveryDropId: null,
        });
        expect(cancelled.billableTotalCents).not.toBeNull();
        expect(await prisma.deliveryDrop.count({ where: { id: dropId } })).toBe(
          0,
        );
        expect(
          await prisma.prepUnit.count({ where: { orderId: order!.id } }),
        ).toBe(2);
        const board = await moduleRef
          .get(KitchenQueryService)
          .getKitchenBoard(date);
        expect(board.filter(({ orderId }) => orderId === order!.id)).toEqual(
          [],
        );

        // Repeated cancellation is idempotent: no second event.
        await lifecycle.cancel(order!.id, fx.staffId);
        expect(await events(order!.id, OrderEventType.ORDER_CANCELLED)).toBe(1);
      });

      it('removes only the cancelled Order from a shared mutable Drop', async () => {
        const [first, second] = await readyOrders('2099-06-02', 2);
        expect(first!.deliveryDropId).toBe(second!.deliveryDropId);
        await lifecycle.cancel(first!.id, fx.staffId);
        const remaining = await prisma.order.findMany({
          where: { deliveryDropId: second!.deliveryDropId },
        });
        expect(remaining.map(({ id }) => id)).toEqual([second!.id]);
      });

      it.each([
        DeliveryDropStatus.OUT_FOR_DELIVERY,
        DeliveryDropStatus.DELIVERED,
      ])('rejects cancellation once the Drop is %s (409)', async (status) => {
        const [order] = await readyOrders(
          status === DeliveryDropStatus.DELIVERED ? '2099-06-04' : '2099-06-03',
          1,
        );
        await prisma.deliveryDrop.update({
          where: { id: order!.deliveryDropId! },
          data: { status },
        });
        await expect(lifecycle.cancel(order!.id, fx.staffId)).rejects.toThrow(
          ConflictException,
        );
        const unchanged = await prisma.order.findUniqueOrThrow({
          where: { id: order!.id },
        });
        expect(unchanged).toMatchObject({
          status: OrderStatus.CONFIRMED,
          deliveryDropId: order!.deliveryDropId,
        });
      });
    });

    it('concurrent cancel and reject: exactly one wins, the other gets a clean 409', async () => {
      const order = await newOrder('2099-06-05');
      const results = await Promise.allSettled([
        lifecycle.cancel(order.id, fx.staffId),
        lifecycle.reject(
          order.id,
          { rejectionReason: 'Out of stock' },
          fx.staffId,
        ),
      ]);
      expect(
        results.filter(({ status }) => status === 'fulfilled'),
      ).toHaveLength(1);
      const loser = results.find(
        ({ status }) => status === 'rejected',
      ) as PromiseRejectedResult;
      expect(loser.reason).toBeInstanceOf(ConflictException);
      const final = await prisma.order.findUniqueOrThrow({
        where: { id: order.id },
      });
      const winnerEvent =
        final.status === OrderStatus.CANCELLED
          ? OrderEventType.ORDER_CANCELLED
          : OrderEventType.ORDER_REJECTED;
      expect([OrderStatus.CANCELLED, OrderStatus.REJECTED]).toContain(
        final.status,
      );
      expect(await events(order.id, winnerEvent)).toBe(1);
      await expect(
        lifecycle.reject(order.id, { rejectionReason: 'again' }, fx.staffId),
      ).rejects.toThrow(ConflictException);
    });

    describe('delivery override', () => {
      it('validates address ownership/activity, packaging activity, Order state and the business date', async () => {
        const otherCompanyId = testId('LIFECYCLE:other-company');
        const foreignAddressId = testId('LIFECYCLE:foreign-address');
        const closedAddressId = testId('LIFECYCLE:closed-address');
        const retiredPackagingId = testId('LIFECYCLE:retired-packaging');
        await prisma.company.create({
          data: {
            id: otherCompanyId,
            name: testName('LIFECYCLE-OTHER-COMPANY'),
            billingContactName: 'Other',
            billingContactEmail: 'test-other@fixtures.test',
            defaultDeliveryTime: new Date(Date.UTC(1970, 0, 1, 12, 0)),
            defaultPackagingTypeId: fx.boxId,
            addresses: {
              create: {
                id: foreignAddressId,
                label: testName('FOREIGN'),
                line1: 'x',
                city: 'x',
                country: 'IN',
              },
            },
          },
        });
        await prisma.companyAddress.create({
          data: {
            id: closedAddressId,
            companyId: fx.companyId,
            label: testName('CLOSED'),
            line1: 'x',
            city: 'x',
            country: 'IN',
            isActive: false,
          },
        });
        await prisma.packagingType.create({
          data: {
            id: retiredPackagingId,
            name: testName('LIFECYCLE-RETIRED'),
            displayOrder: 999,
            isActive: false,
          },
        });

        const date = '2099-06-08';
        const placed = await newOrder(date);
        await expect(
          lifecycle.overrideDelivery(
            placed.id,
            { deliveryAddressId: foreignAddressId },
            fx.staffId,
          ),
        ).rejects.toThrow(ConflictException);
        await expect(
          lifecycle.overrideDelivery(
            placed.id,
            { deliveryAddressId: closedAddressId },
            fx.staffId,
          ),
        ).rejects.toThrow(ConflictException);
        await expect(
          lifecycle.overrideDelivery(
            placed.id,
            { packagingTypeId: retiredPackagingId },
            fx.staffId,
          ),
        ).rejects.toThrow(ConflictException);
        await expect(
          lifecycle.overrideDelivery(
            placed.id,
            { deliveryAt: `${plusDays(date, 1)}T13:00:00+05:30` },
            fx.staffId,
          ),
        ).rejects.toThrow(/business delivery date/);
        // 00:30 IST on the delivery date is 19:00Z the previous UTC day — still the right business date.
        const early = await lifecycle.overrideDelivery(
          placed.id,
          { deliveryAt: `${date}T00:30:00+05:30` },
          fx.staffId,
        );
        expect(early.deliveryAt.toISOString()).toBe(
          `${plusDays(date, -1)}T19:00:00.000Z`,
        );
        expect(early).toMatchObject({
          totalCents: placed.totalCents,
          billableTotalCents: null,
        });

        const draft = await newOrder(date, false);
        await expect(
          lifecycle.overrideDelivery(
            draft.id,
            { packagingTypeId: fx.trayId },
            fx.staffId,
          ),
        ).rejects.toThrow(/status DRAFT/);
        await lifecycle.cancel(draft.id, fx.staffId);
        await expect(
          lifecycle.overrideDelivery(
            draft.id,
            { packagingTypeId: fx.trayId },
            fx.staffId,
          ),
        ).rejects.toThrow(/status CANCELLED/);
      });

      it('packaging-only changes never regroup and never reprice', async () => {
        const [order] = await readyOrders('2099-06-09', 1);
        const updated = await lifecycle.overrideDelivery(
          order!.id,
          { packagingTypeId: fx.trayId },
          fx.staffId,
        );
        expect(updated).toMatchObject({
          packagingTypeId: fx.trayId,
          deliveryDropId: order!.deliveryDropId,
          totalCents: order!.totalCents,
          billableTotalCents: order!.billableTotalCents,
        });
        expect(
          await prisma.deliveryDrop.count({
            where: { id: order!.deliveryDropId! },
          }),
        ).toBe(1);
        expect(
          await events(order!.id, OrderEventType.DELIVERY_DETAILS_CHANGED),
        ).toBe(1);
      });

      it('regroups address/time changes atomically before departure and rejects them after', async () => {
        const date = '2099-06-10';
        const [moved, stays] = await readyOrders(date, 2);
        const originalDrop = moved!.deliveryDropId!;
        expect(stays!.deliveryDropId).toBe(originalDrop);

        const afterAddress = await lifecycle.overrideDelivery(
          moved!.id,
          { deliveryAddressId: fx.annexAddressId },
          fx.staffId,
        );
        expect(afterAddress.deliveryDropId).not.toBeNull();
        expect(afterAddress.deliveryDropId).not.toBe(originalDrop);
        expect(
          (
            await prisma.deliveryDrop.findUniqueOrThrow({
              where: { id: afterAddress.deliveryDropId! },
            })
          ).addressLabelSnapshot,
        ).toBe('TEST-LIFECYCLE-ANNEX');
        expect(
          await prisma.order.count({ where: { deliveryDropId: originalDrop } }),
        ).toBe(1);

        // Moving the last member out by time deletes the emptied Drop and creates one at the new time.
        const afterTime = await lifecycle.overrideDelivery(
          stays!.id,
          { deliveryAt: `${date}T14:00:00+05:30` },
          fx.staffId,
        );
        expect(
          await prisma.deliveryDrop.count({ where: { id: originalDrop } }),
        ).toBe(0);
        const newDrop = await prisma.deliveryDrop.findUniqueOrThrow({
          where: { id: afterTime.deliveryDropId! },
        });
        expect(newDrop.scheduledDeliveryAt.toISOString()).toBe(
          `${date}T08:30:00.000Z`,
        );
        expect(afterTime.billableTotalCents).toBe(stays!.billableTotalCents);

        await prisma.deliveryDrop.update({
          where: { id: newDrop.id },
          data: { status: DeliveryDropStatus.OUT_FOR_DELIVERY },
        });
        await expect(
          lifecycle.overrideDelivery(
            stays!.id,
            { deliveryAt: `${date}T15:00:00+05:30` },
            fx.staffId,
          ),
        ).rejects.toThrow(/OUT_FOR_DELIVERY/);
        await expect(
          lifecycle.overrideDelivery(
            stays!.id,
            {
              deliveryAddressId:
                fx.homeAddressId === afterTime.deliveryAddressId
                  ? fx.annexAddressId
                  : fx.homeAddressId,
            },
            fx.staffId,
          ),
        ).rejects.toThrow(ConflictException);
      });
    });

    describe('lock ordering', () => {
      it('takes grouping advisory locks before the Order row lock (no Order lock held while waiting)', async () => {
        const [order] = await readyOrders('2099-06-11', 1);
        const key = grouping.getCanonicalKey(order!);
        const holder = new pg.Client({
          connectionString: process.env.TEST_DATABASE_URL,
        });
        const probe = new pg.Client({
          connectionString: process.env.TEST_DATABASE_URL,
        });
        await holder.connect();
        await probe.connect();
        try {
          await holder.query('BEGIN');
          await holder.query(
            'SELECT pg_advisory_xact_lock(hashtextextended($1, 0))',
            [key],
          );
          const override = lifecycle.overrideDelivery(
            order!.id,
            { deliveryAt: `2099-06-11T15:00:00+05:30` },
            fx.staffId,
          );
          override.catch(() => undefined);
          let waiting = false;
          for (let attempt = 0; attempt < 100 && !waiting; attempt++) {
            const { rows } = await probe.query(
              `SELECT count(*)::int AS n FROM pg_stat_activity WHERE datname = current_database() AND wait_event = 'advisory' AND state = 'active'`,
            );
            waiting = rows[0].n > 0;
            if (!waiting)
              await new Promise((resolve) => setTimeout(resolve, 100));
          }
          expect(waiting).toBe(true);
          // While the override waits for the grouping lock it must not hold the Order row lock.
          await probe.query('BEGIN');
          await expect(
            probe.query(
              'SELECT id FROM "Order" WHERE id = $1 FOR UPDATE NOWAIT',
              [order!.id],
            ),
          ).resolves.toBeDefined();
          await probe.query('ROLLBACK');
          await holder.query('COMMIT');
          await expect(override).resolves.toMatchObject({
            status: OrderStatus.CONFIRMED,
          });
        } finally {
          await holder.query('ROLLBACK').catch(() => undefined);
          await probe.query('ROLLBACK').catch(() => undefined);
          await holder.end();
          await probe.end();
        }
      });

      it('concurrent regroup and grouping reconciliation complete without deadlock', async () => {
        const date = '2099-06-12';
        const ready = await readyOrders(date, 3);
        const results = await Promise.allSettled([
          lifecycle.overrideDelivery(
            ready[0]!.id,
            { deliveryAddressId: fx.annexAddressId },
            fx.staffId,
          ),
          lifecycle.cancel(ready[1]!.id, fx.staffId),
          grouping.ensureReadyDropForOrder(ready[2]!.id),
          grouping.reconcileAll(),
        ]);
        expect(results.filter(({ status }) => status === 'rejected')).toEqual(
          [],
        );
        const membership = await prisma.order.findMany({
          where: { id: { in: ready.map(({ id }) => id) } },
          select: { id: true, status: true, deliveryDropId: true },
        });
        expect(membership.find(({ id }) => id === ready[1]!.id)).toMatchObject({
          status: OrderStatus.CANCELLED,
          deliveryDropId: null,
        });
        expect(
          membership
            .filter(({ status }) => status === OrderStatus.CONFIRMED)
            .every(({ deliveryDropId }) => deliveryDropId !== null),
        ).toBe(true);
      });
    });
  },
);
