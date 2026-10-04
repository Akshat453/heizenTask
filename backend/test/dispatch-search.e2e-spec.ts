import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Temporal } from '@js-temporal/polyfill';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { configureApp } from '../src/app.setup.js';
import { AppModule } from '../src/app.module.js';
import { BusinessTimeService } from '../src/business-time/business-time.service.js';
import { DispatchLifecycleService } from '../src/dispatch/services/dispatch-lifecycle.service.js';
import { DispatchQueryService } from '../src/dispatch/services/dispatch-query.service.js';
import { DriverQueryService } from '../src/driver/services/driver-query.service.js';
import { KitchenLifecycleService } from '../src/kitchen/services/kitchen-lifecycle.service.js';
import type { OrderLineDto } from '../src/orders/dto/order.dto.js';
import { CutoffService } from '../src/orders/services/cutoff.service.js';
import { OrderCreationService } from '../src/orders/services/order-creation.service.js';
import { OrderQueryService } from '../src/orders/services/order-query.service.js';
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
 * Drop search, driver filter, drop→orders filter, meals and packaging on real
 * PostgreSQL (test database only), plus one authenticated HTTP search.
 */
const DATE = '2099-10-14';
const NOON = Temporal.Instant.from('2099-10-14T06:30:00Z'); // 12:00 IST
const AFTER_CUTOFF = Temporal.Instant.from('2100-01-01T00:00:00Z');
const PASSWORD = 'Fixture@1234';

describe('Drop search and summaries (PostgreSQL)', { timeout: 600_000 }, () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let a: OrderingFixture;
  let b: OrderingFixture;
  let restoreSettings: () => Promise<void>;
  const createdPermissionIds: string[] = [];
  const driverId = testId('DSEARCH:driver');
  let dropA = '';
  let dropB = '';
  let ordersInA: string[] = [];

  const line = (fx: OrderingFixture, quantity: number): OrderLineDto => ({
    dishId: fx.bowlId,
    quantity,
    combinations: [
      {
        quantity,
        options: [{ optionGroupId: fx.proteinGroupId, optionId: fx.paneerId }],
      },
    ],
  });
  const permission = async (key: string) => {
    const existing = await prisma.permission.findUnique({ where: { key } });
    if (existing) return existing.id;
    const created = await prisma.permission.create({
      data: { key, description: 'Test fixture' },
    });
    createdPermissionIds.push(created.id);
    return created.id;
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);
    await cleanupTestData(prisma);
    restoreSettings = await ensurePlatformSettings(prisma);
    a = await createOrderingFixture(prisma, 'DSA');
    b = await createOrderingFixture(prisma, 'DSB');
    await prisma.employee.update({
      where: { id: a.employeeId },
      data: { canChangePackaging: true },
    });

    const passwordHash = await bcrypt.hash(PASSWORD, 4);
    await prisma.role.create({
      data: {
        id: testId('DSEARCH:driver-role'),
        name: testName('DSEARCH-DRIVER'),
        description: 'Test drivers',
        permissions: {
          create: [
            { permissionId: await permission('driver.own_drops.deliver') },
          ],
        },
      },
    });
    await prisma.role.create({
      data: {
        id: testId('DSEARCH:dispatch-role'),
        name: testName('DSEARCH-DISPATCH'),
        description: 'Test dispatch',
        permissions: {
          create: [{ permissionId: await permission('dispatch.read') }],
        },
      },
    });
    await prisma.staffUser.createMany({
      data: [
        {
          id: driverId,
          name: testName('DSEARCH-RAVI-DRIVER'),
          email: testEmail('dsearch-driver'),
          passwordHash,
          roleId: testId('DSEARCH:driver-role'),
        },
        {
          id: testId('DSEARCH:dispatcher'),
          name: testName('DSEARCH-DISPATCHER'),
          email: testEmail('dsearch-dispatch'),
          passwordHash,
          roleId: testId('DSEARCH:dispatch-role'),
        },
      ],
    });

    // Company A: two orders in one drop, boxed (3 meals) and tray (2 meals).
    const orders = app.get(OrderCreationService);
    const a1 = await orders.create(
      {
        employeeId: a.employeeId,
        deliveryDate: DATE,
        placeOrder: true,
        lines: [line(a, 3)],
      },
      a.staffId,
    );
    const a2 = await orders.create(
      {
        employeeId: a.employeeId,
        deliveryDate: DATE,
        placeOrder: true,
        lines: [line(a, 2)],
        packagingTypeId: a.trayId,
      },
      a.staffId,
    );
    // Company B: one order, no driver.
    const b1 = await orders.create(
      {
        employeeId: b.employeeId,
        deliveryDate: DATE,
        placeOrder: true,
        lines: [line(b, 1)],
      },
      b.staffId,
    );
    const businessTime = app.get(BusinessTimeService);
    const spy = vi.spyOn(businessTime, 'now').mockReturnValue(AFTER_CUTOFF);
    try {
      await app
        .get(CutoffService)
        .processManual({ deliveryDate: DATE }, a.staffId);
    } finally {
      spy.mockRestore();
    }
    const kitchen = app.get(KitchenLifecycleService);
    for (const order of [a1, a2, b1])
      await kitchen.forceCompleteOrder(order.id, a.staffId);
    const dropOf = async (id: string) =>
      (await prisma.order.findUniqueOrThrow({ where: { id } })).deliveryDropId!;
    dropA = await dropOf(a1.id);
    dropB = await dropOf(b1.id);
    expect(await dropOf(a2.id)).toBe(dropA);
    ordersInA = [a1.id, a2.id];
    await app
      .get(DispatchLifecycleService)
      .assignDriver(dropA, driverId, a.staffId);
    // Make sure company B's drop has no driver (no default driver in fixtures).
    await prisma.deliveryDrop.update({
      where: { id: dropB },
      data: { driverStaffUserId: null },
    });
  }, 600_000);

  afterEach(() => vi.restoreAllMocks());

  afterAll(async () => {
    try {
      await cleanupTestData(prisma);
      if (createdPermissionIds.length)
        await prisma.permission.deleteMany({
          where: { id: { in: createdPermissionIds } },
        });
    } finally {
      await restoreSettings();
      await app.close();
    }
  }, 120_000);

  const list = (query: Record<string, string>) =>
    app
      .get(DispatchQueryService)
      .list({ date: DATE, page: 1, pageSize: 20, ...query });

  it('search matches company, address label and driver name (case-insensitive)', async () => {
    const byCompany = await list({ search: 'test-dsa-company' });
    expect(byCompany.data.map((d) => d.id)).toEqual([dropA]);
    expect(byCompany.pagination.totalItems).toBe(1);
    expect((await list({ search: 'DSB-HOME' })).data.map((d) => d.id)).toEqual([
      dropB,
    ]);
    expect(
      (await list({ search: 'ravi-driver' })).data.map((d) => d.id),
    ).toEqual([dropA]);
    expect(
      (await list({ search: 'no such place' })).pagination.totalItems,
    ).toBe(0);
  });

  it('driverId=none returns only drops without a driver; an id returns that driver', async () => {
    expect((await list({ driverId: 'none' })).data.map((d) => d.id)).toEqual([
      dropB,
    ]);
    expect((await list({ driverId })).data.map((d) => d.id)).toEqual([dropA]);
  });

  it('each drop carries its orders, meals and packaging counts', async () => {
    const [drop] = (await list({ search: 'test-dsa-company' })).data;
    expect(drop!.meals).toBe(5);
    expect(drop!.orders.map((o) => o.id).sort()).toEqual([...ordersInA].sort());
    expect(drop!.orders.map((o) => o.meals).sort()).toEqual([2, 3]);
    expect(drop!.packaging).toEqual([
      { name: 'TEST-DSA-BOX', count: 1 },
      { name: 'TEST-DSA-TRAY', count: 1 },
    ]);
    expect(drop).not.toHaveProperty('lines');
  });

  it('GET /orders deliveryDropId filter returns only that drop’s orders', async () => {
    const result = await app
      .get(OrderQueryService)
      .list({ deliveryDropId: dropA, page: 1, pageSize: 20 });
    expect(result.data.map((o) => o.id).sort()).toEqual([...ordersInA].sort());
  });

  it('the driver route adds meals and packaging, scoped to the driver', async () => {
    vi.spyOn(app.get(BusinessTimeService), 'now').mockReturnValue(NOON);
    const today = await app.get(DriverQueryService).getTodayDrops(driverId);
    expect(today.businessDate).toBe(DATE);
    expect(today.data.map((d) => d.id)).toEqual([dropA]);
    expect(today.data[0]).toMatchObject({ meals: 5 });
    expect(today.data[0]!.packaging).toHaveLength(2);
    expect(today.data[0]!.orders.map((o) => o.orderNumber).length).toBe(2);
  });

  it('a signed-in dispatch user searching by company name gets only matching drops', async () => {
    const agent = request.agent(app.getHttpServer());
    await agent
      .post('/auth/login')
      .send({ email: testEmail('dsearch-dispatch'), password: PASSWORD })
      .expect(200);
    const response = await agent
      .get(`/dispatch/drops?date=${DATE}&search=TEST-DSB-COMPANY`)
      .expect(200);
    expect(response.body.pagination.totalItems).toBe(1);
    expect(response.body.data[0]).toMatchObject({
      id: dropB,
      company: { name: 'TEST-DSB-COMPANY' },
      meals: 1,
    });
    await agent.get('/dispatch/drops?driverId=nobody').expect(400);
  });
});
