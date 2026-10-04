import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Temporal } from '@js-temporal/polyfill';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { configureApp } from '../src/app.setup.js';
import { AppModule } from '../src/app.module.js';
import { BusinessTimeService } from '../src/business-time/business-time.service.js';
import { OrderStatus } from '../src/generated/prisma/enums.js';
import { KitchenLifecycleService } from '../src/kitchen/services/kitchen-lifecycle.service.js';
import { CutoffService } from '../src/orders/services/cutoff.service.js';
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
 * Regression for @CurrentUser('id'): real login, real cookie, real controllers.
 * Before the fix every one of these routes received the whole user object as
 * the actor/driver id and failed inside Prisma with a 500.
 */
const PASSWORD = 'Fixture@1234';
const AFTER_CUTOFF = Temporal.Instant.from('2100-01-01T00:00:00Z');
const DELIVERY_DATE = '2099-09-14';

const ACCOUNTS = {
  admin: ['orders.create', 'orders.read'],
  kitchen: ['kitchen.update'],
  dispatch: ['dispatch.assign_driver'],
  driver: ['driver.own_drops.read', 'driver.own_drops.deliver'],
} as const;
type AccountKey = keyof typeof ACCOUNTS;

describe('HTTP actor identity (@CurrentUser)', { timeout: 300_000 }, () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let fx: OrderingFixture;
  let restoreSettings: () => Promise<void>;
  const createdPermissionIds: string[] = [];
  const staffId = (key: AccountKey) => testId(`HTTPID:${key}`);
  const agents = {} as Record<AccountKey, ReturnType<typeof request.agent>>;

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
    fx = await createOrderingFixture(prisma, 'HTTPID');

    const passwordHash = await bcrypt.hash(PASSWORD, 4);
    for (const [key, keys] of Object.entries(ACCOUNTS) as [
      AccountKey,
      readonly string[],
    ][]) {
      const permissionIds: string[] = [];
      for (const permissionKey of keys) {
        const existing = await prisma.permission.findUnique({
          where: { key: permissionKey },
        });
        const permission =
          existing ??
          (await prisma.permission.create({
            data: { key: permissionKey, description: 'Test fixture' },
          }));
        if (!existing) createdPermissionIds.push(permission.id);
        permissionIds.push(permission.id);
      }
      const roleId = testId(`HTTPID:${key}-role`);
      await prisma.role.create({
        data: {
          id: roleId,
          name: testName(`HTTPID-${key.toUpperCase()}`),
          description: 'Test role',
          permissions: {
            create: permissionIds.map((permissionId) => ({ permissionId })),
          },
        },
      });
      await prisma.staffUser.create({
        data: {
          id: staffId(key),
          name: testName(`HTTPID-${key}`),
          email: testEmail(`httpid-${key}`),
          passwordHash,
          roleId,
        },
      });
      agents[key] = request.agent(app.getHttpServer());
      await agents[key]
        .post('/auth/login')
        .send({ email: testEmail(`httpid-${key}`), password: PASSWORD })
        .expect(200);
    }
  });

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
  });

  it('GET /driver/drops/today returns the signed-in driver’s drops (200)', async () => {
    const response = await agents.driver.get('/driver/drops/today').expect(200);
    expect(response.body).toMatchObject({ data: [] });
    expect(typeof response.body.businessDate).toBe('string');
  });

  it('POST /orders, kitchen start and assign-driver record the authenticated actor', async () => {
    // 1. Orders: the creator is the logged-in admin.
    const created = await agents.admin
      .post('/orders')
      .send({
        employeeId: fx.employeeId,
        deliveryDate: DELIVERY_DATE,
        placeOrder: true,
        lines: [
          {
            dishId: fx.bowlId,
            quantity: 1,
            combinations: [
              {
                quantity: 1,
                options: [
                  { optionGroupId: fx.proteinGroupId, optionId: fx.paneerId },
                ],
              },
            ],
          },
        ],
      })
      .expect(201);
    const orderId = created.body.id as string;
    const order = await prisma.order.findUniqueOrThrow({
      where: { id: orderId },
    });
    expect(order.createdByStaffUserId).toBe(staffId('admin'));
    expect(order.status).toBe(OrderStatus.PLACED);

    // Confirm through cut-off (service call with a clock after the cut-off).
    const businessTime = app.get(BusinessTimeService);
    const spy = vi.spyOn(businessTime, 'now').mockReturnValue(AFTER_CUTOFF);
    try {
      await app
        .get(CutoffService)
        .processManual({ deliveryDate: DELIVERY_DATE }, fx.staffId);
    } finally {
      spy.mockRestore();
    }
    const [unit] = await prisma.prepUnit.findMany({ where: { orderId } });
    expect(unit).toBeDefined();

    // 2. Kitchen: the starter is the logged-in kitchen user.
    const started = await agents.kitchen.post(
      `/kitchen/prep-units/${unit!.id}/start`,
    );
    expect([200, 201]).toContain(started.status);
    const startedUnit = await prisma.prepUnit.findUniqueOrThrow({
      where: { id: unit!.id },
    });
    expect(startedUnit.startedByStaffUserId).toBe(staffId('kitchen'));

    // Make the order dispatch-ready (service call), then assign over HTTP.
    await app
      .get(KitchenLifecycleService)
      .forceCompleteOrder(orderId, fx.staffId);
    const { deliveryDropId } = await prisma.order.findUniqueOrThrow({
      where: { id: orderId },
    });
    expect(deliveryDropId).not.toBeNull();

    // 3. Dispatch: assignment succeeds with a body driverId and the actor from the cookie.
    const assigned = await agents.dispatch
      .post(`/dispatch/drops/${deliveryDropId}/assign-driver`)
      .send({ driverId: staffId('driver') });
    expect([200, 201]).toContain(assigned.status);
    const drop = await prisma.deliveryDrop.findUniqueOrThrow({
      where: { id: deliveryDropId! },
    });
    expect(drop.driverStaffUserId).toBe(staffId('driver'));
  });
});
