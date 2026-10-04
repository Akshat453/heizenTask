import { Test, TestingModule } from '@nestjs/testing';
import { Temporal } from '@js-temporal/polyfill';
import { AppModule } from '../src/app.module.js';
import { BusinessTimeService } from '../src/business-time/business-time.service.js';
import { AdminDashboardService } from '../src/dashboard/services/admin-dashboard.service.js';
import { DispatchDashboardService } from '../src/dashboard/services/dispatch-dashboard.service.js';
import { DriverDashboardService } from '../src/dashboard/services/driver-dashboard.service.js';
import { KitchenDashboardService } from '../src/dashboard/services/kitchen-dashboard.service.js';
import { DispatchLifecycleService } from '../src/dispatch/services/dispatch-lifecycle.service.js';
import { DispatchQueryService } from '../src/dispatch/services/dispatch-query.service.js';
import { DriverLifecycleService } from '../src/driver/services/driver-lifecycle.service.js';
import { KitchenLifecycleService } from '../src/kitchen/services/kitchen-lifecycle.service.js';
import type { OrderLineDto } from '../src/orders/dto/order.dto.js';
import { CutoffService } from '../src/orders/services/cutoff.service.js';
import { OrderCreationService } from '../src/orders/services/order-creation.service.js';
import { OrderLifecycleService } from '../src/orders/services/order-lifecycle.service.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import {
  cleanupTestData,
  testEmail,
  testId,
  testName,
} from './support/fixtures.js';
import {
  createOrderingFixture,
  ensurePlatformSettings,
  type OrderingFixture,
} from './support/ordering-fixture.js';

/**
 * The new dashboard figures against real PostgreSQL (test database only).
 * Business "today" is pinned to Wednesday 2099-09-16 (Asia/Kolkata).
 */
const TODAY = '2099-09-16';
const TWO_DAYS_AGO = '2099-09-14';
const TOMORROW = '2099-09-17';
const IN_TWO_DAYS = '2099-09-18';
const NOON_TODAY = Temporal.Instant.from('2099-09-16T06:30:00Z'); // 12:00 IST
const EMPTY_DAY = Temporal.Instant.from('2099-12-02T06:30:00Z');
const AFTER_CUTOFF = Temporal.Instant.from('2100-01-01T00:00:00Z');

describe('Dashboard figures (PostgreSQL)', { timeout: 600_000 }, () => {
  let moduleRef: TestingModule;
  let prisma: PrismaService;
  let businessTime: BusinessTimeService;
  let fx: OrderingFixture;
  let restoreSettings: () => Promise<void>;
  let createdPermissionId: string | null = null;
  const driverId = testId('DASH:driver');
  let placedTomorrowTotal = 0;

  const line = (quantity: number): OrderLineDto => ({
    dishId: fx.bowlId,
    quantity,
    combinations: [
      {
        quantity,
        options: [{ optionGroupId: fx.proteinGroupId, optionId: fx.paneerId }],
      },
    ],
  });
  const create = (
    deliveryDate: string,
    quantity: number,
    options: { place?: boolean; deliveryTime?: string } = {},
  ) =>
    moduleRef.get(OrderCreationService).create(
      {
        employeeId: fx.employeeId,
        deliveryDate,
        placeOrder: options.place ?? true,
        lines: [line(quantity)],
        ...(options.deliveryTime && { deliveryTime: options.deliveryTime }),
      },
      fx.staffId,
    );
  const atInstant = (instant: Temporal.Instant) =>
    vi.spyOn(businessTime, 'now').mockReturnValue(instant);

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    prisma = moduleRef.get(PrismaService);
    businessTime = moduleRef.get(BusinessTimeService);
    await cleanupTestData(prisma);
    restoreSettings = await ensurePlatformSettings(prisma);
    fx = await createOrderingFixture(prisma, 'DASH');
    // Separate drops need distinct delivery times.
    await prisma.employee.update({
      where: { id: fx.employeeId },
      data: { canChangeDeliveryTime: true },
    });

    let permission = await prisma.permission.findUnique({
      where: { key: 'driver.own_drops.deliver' },
    });
    if (!permission) {
      permission = await prisma.permission.create({
        data: { key: 'driver.own_drops.deliver', description: 'Test' },
      });
      createdPermissionId = permission.id;
    }
    await prisma.role.create({
      data: {
        id: testId('DASH:driver-role'),
        name: testName('DASH-DRIVER-ROLE'),
        description: 'Test drivers',
        permissions: { create: { permissionId: permission.id } },
      },
    });
    await prisma.staffUser.create({
      data: {
        id: driverId,
        name: testName('DASH-DRIVER'),
        email: testEmail('dash-driver'),
        passwordHash: 'x',
        roleId: testId('DASH:driver-role'),
      },
    });

    // Orders created while placing is still allowed (real clock, 2099 dates).
    const deliveredOnTime = await create(TODAY, 3);
    const deliveredLate = await create(TODAY, 2, { deliveryTime: '14:00' });
    const confirmedCooking = await create(TODAY, 2, { deliveryTime: '15:00' });
    const cancelledAfterConfirm = await create(TODAY, 4, {
      deliveryTime: '16:00',
    });
    const pastConfirmed = await create(TWO_DAYS_AGO, 2);
    const placedTomorrow = await create(TOMORROW, 1);
    placedTomorrowTotal = placedTomorrow.totalCents;
    await create(IN_TWO_DAYS, 1, { place: false }); // draft

    const spy = atInstant(AFTER_CUTOFF);
    try {
      for (const date of [TODAY, TWO_DAYS_AGO])
        await moduleRef
          .get(CutoffService)
          .processManual({ deliveryDate: date }, fx.staffId);
    } finally {
      spy.mockRestore();
    }
    await moduleRef
      .get(OrderLifecycleService)
      .cancel(cancelledAfterConfirm.id, fx.staffId);
    void confirmedCooking;

    // Two drops delivered today: one on time, one 10 minutes late.
    const kitchen = moduleRef.get(KitchenLifecycleService);
    const dispatch = moduleRef.get(DispatchLifecycleService);
    const driver = moduleRef.get(DriverLifecycleService);
    for (const order of [deliveredOnTime, deliveredLate]) {
      await kitchen.forceCompleteOrder(order.id, fx.staffId);
      const { deliveryDropId } = await prisma.order.findUniqueOrThrow({
        where: { id: order.id },
      });
      await dispatch.assignDriver(deliveryDropId!, driverId, fx.staffId);
      await dispatch.outForDelivery(deliveryDropId!, fx.staffId);
      await driver.markDelivered(deliveryDropId!, driverId, 'Left at desk');
    }
    const lateDrop = await prisma.order.findUniqueOrThrow({
      where: { id: deliveredLate.id },
      include: { deliveryDrop: true },
    });
    await prisma.deliveryDrop.update({
      where: { id: lateDrop.deliveryDropId! },
      data: {
        deliveredAt: new Date(
          lateDrop.deliveryDrop!.scheduledDeliveryAt.getTime() + 10 * 60_000,
        ),
      },
    });
    void pastConfirmed;
  }, 600_000);

  afterEach(() => vi.restoreAllMocks());

  afterAll(async () => {
    try {
      await cleanupTestData(prisma);
      if (createdPermissionId)
        await prisma.permission.delete({ where: { id: createdPermissionId } });
    } finally {
      await restoreSettings();
      await moduleRef.close();
    }
  }, 120_000);

  it('admin: meals, deliveries, placed backlog, uninvoiced age, trends and mix', async () => {
    atInstant(NOON_TODAY);
    const { businessDate, metrics } = await moduleRef
      .get(AdminDashboardService)
      .getAdminDashboard();
    expect(businessDate).toBe(TODAY);
    // 3 + 2 delivered + 2 confirmed; the cancelled-after-confirmation 4 are excluded.
    expect(metrics.mealsToday).toBe(7);
    expect(metrics.deliveredToday).toEqual({ delivered: 2, onTime: 1 });
    expect(metrics.placedAwaitingCutoff).toEqual({
      count: 1,
      totalCents: placedTomorrowTotal,
    });
    expect(metrics.oldestUninvoicedDeliveryDate).toBe(TWO_DAYS_AGO);
    expect(metrics.deliveriesByDate).toHaveLength(11);
    expect(metrics.deliveriesByDate[0]!.date).toBe('2099-09-13');
    const byDate = Object.fromEntries(
      metrics.deliveriesByDate.map((d) => [d.date, d]),
    );
    expect(byDate[TWO_DAYS_AGO]).toEqual({
      date: TWO_DAYS_AGO,
      orders: 1,
      meals: 2,
    });
    expect(byDate[TODAY]).toEqual({ date: TODAY, orders: 3, meals: 7 });
    expect(byDate[TOMORROW]).toEqual({ date: TOMORROW, orders: 0, meals: 0 });
    expect(metrics.week).toEqual({ from: '2099-09-14', to: '2099-09-20' });
    expect(metrics.statusMixThisWeek).toEqual({
      DRAFT: 1,
      PLACED: 1,
      CONFIRMED: 2,
      CANCELLED: 1,
      REJECTED: 0,
      DELIVERED: 2,
    });
    expect(metrics.topCompaniesThisWeek).toEqual([
      {
        companyId: fx.companyId,
        name: expect.any(String),
        meals: 9,
        orders: 4,
      },
    ]);
  });

  it('kitchen: total and done units exclude orders cancelled after confirmation', async () => {
    atInstant(NOON_TODAY);
    const { metrics } = await moduleRef
      .get(KitchenDashboardService)
      .getKitchenDashboard();
    // One unit per combination: two delivered orders (done) + one cooking.
    expect(metrics.prepUnitsTotal).toBe(3);
    expect(metrics.prepUnitsDone).toBe(2);
    expect(metrics.notStarted).toBe(1);
  });

  it('dispatch: drops today, waiting on kitchen and delivered on time', async () => {
    atInstant(NOON_TODAY);
    const { metrics } = await moduleRef
      .get(DispatchDashboardService)
      .getDispatchDashboard();
    expect(metrics.dropsToday).toBe(2);
    expect(metrics.waitingOnKitchen).toBe(1);
    expect(metrics.deliveredToday).toEqual({ delivered: 2, onTime: 1 });
  });

  it('driver: on-time and late counts for the driver’s delivered drops', async () => {
    atInstant(NOON_TODAY);
    const { metrics } = await moduleRef
      .get(DriverDashboardService)
      .getDriverDashboard(driverId);
    expect(metrics).toMatchObject({
      delivered: 2,
      onTimeCount: 1,
      lateCount: 1,
    });
  });

  it('dispatch list: plannedDispatchReadyAt = scheduled delivery − order lead', async () => {
    atInstant(NOON_TODAY);
    const { data } = await moduleRef
      .get(DispatchQueryService)
      .list({ date: TODAY, page: 1, pageSize: 20 });
    expect(data).toHaveLength(2);
    for (const drop of data) {
      const order = await prisma.order.findFirstOrThrow({
        where: { deliveryDropId: drop.id },
      });
      expect(drop.plannedDispatchReadyAt?.getTime()).toBe(
        drop.scheduledDeliveryAt.getTime() -
          order.deliveryLeadMinutesSnapshot * 60_000,
      );
      // Orders are exposed as public summaries only (no lead minutes or lines).
      expect(drop.orders).toHaveLength(1);
      expect(Object.keys(drop.orders[0]!).sort()).toEqual([
        'employeeName',
        'id',
        'meals',
        'orderNumber',
        'packagingName',
      ]);
    }
  });

  it('an empty day returns zeros and nulls', async () => {
    atInstant(EMPTY_DAY);
    const admin = (
      await moduleRef.get(AdminDashboardService).getAdminDashboard()
    ).metrics;
    expect(admin.mealsToday).toBe(0);
    expect(admin.deliveredToday).toEqual({ delivered: 0, onTime: 0 });
    expect(admin.placedAwaitingCutoff).toEqual({ count: 0, totalCents: 0 });
    expect(
      admin.deliveriesByDate.every((d) => d.orders === 0 && d.meals === 0),
    ).toBe(true);
    expect(Object.values(admin.statusMixThisWeek).every((n) => n === 0)).toBe(
      true,
    );
    expect(admin.topCompaniesThisWeek).toEqual([]);
    const kitchen = (
      await moduleRef.get(KitchenDashboardService).getKitchenDashboard()
    ).metrics;
    expect(kitchen).toMatchObject({
      prepUnitsTotal: 0,
      prepUnitsDone: 0,
      nextDeadline: null,
    });
    const dispatch = (
      await moduleRef.get(DispatchDashboardService).getDispatchDashboard()
    ).metrics;
    expect(dispatch).toMatchObject({
      dropsToday: 0,
      waitingOnKitchen: 0,
      deliveredToday: { delivered: 0, onTime: 0 },
    });
    const driver = (
      await moduleRef.get(DriverDashboardService).getDriverDashboard(driverId)
    ).metrics;
    expect(driver).toMatchObject({
      onTimeCount: 0,
      lateCount: 0,
      nextDrop: null,
    });
  });
});
