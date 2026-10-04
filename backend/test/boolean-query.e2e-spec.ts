import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Temporal } from '@js-temporal/polyfill';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { configureApp } from '../src/app.setup.js';
import { AppModule } from '../src/app.module.js';
import { InvoiceCreationService } from '../src/billing/services/invoice-creation.service.js';
import { BusinessTimeService } from '../src/business-time/business-time.service.js';
import { CutoffService } from '../src/orders/services/cutoff.service.js';
import { OrderCreationService } from '../src/orders/services/order-creation.service.js';
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
 * Boolean query parameters over real HTTP: "false" must mean false.
 * (Before the shared @BooleanQuery transform, `isActive=false` and
 * `invoiced=false` were read as true.)
 */
const DATE = '2099-11-11';
const AFTER_CUTOFF = Temporal.Instant.from('2100-01-01T00:00:00Z');
const PASSWORD = 'Fixture@1234';

describe('Boolean query parameters (e2e)', { timeout: 600_000 }, () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let fx: OrderingFixture;
  let restoreSettings: () => Promise<void>;
  let agent: ReturnType<typeof request.agent>;
  const createdPermissionIds: string[] = [];
  let invoicedOrder = '';
  let uninvoicedOrder = '';

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
    fx = await createOrderingFixture(prisma, 'BQ');
    await prisma.dish.update({
      where: { id: fx.hiddenDishId },
      data: { isActive: false },
    });

    const permissionIds: string[] = [];
    for (const key of ['catalogue.read', 'orders.read']) {
      const existing = await prisma.permission.findUnique({ where: { key } });
      const permission =
        existing ??
        (await prisma.permission.create({
          data: { key, description: 'Test fixture' },
        }));
      if (!existing) createdPermissionIds.push(permission.id);
      permissionIds.push(permission.id);
    }
    await prisma.role.create({
      data: {
        id: testId('BQ:reader-role'),
        name: testName('BQ-READER'),
        description: 'Test reader',
        permissions: {
          create: permissionIds.map((permissionId) => ({ permissionId })),
        },
      },
    });
    await prisma.staffUser.create({
      data: {
        id: testId('BQ:reader'),
        name: testName('BQ-READER'),
        email: testEmail('bq-reader'),
        passwordHash: await bcrypt.hash(PASSWORD, 4),
        roleId: testId('BQ:reader-role'),
      },
    });

    const orders = app.get(OrderCreationService);
    const line = {
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
    };
    const [a, b] = [
      await orders.create(
        {
          employeeId: fx.employeeId,
          deliveryDate: DATE,
          placeOrder: true,
          lines: [line],
        },
        fx.staffId,
      ),
      await orders.create(
        {
          employeeId: fx.employeeId,
          deliveryDate: DATE,
          placeOrder: true,
          lines: [line],
        },
        fx.staffId,
      ),
    ];
    const spy = vi
      .spyOn(app.get(BusinessTimeService), 'now')
      .mockReturnValue(AFTER_CUTOFF);
    try {
      await app
        .get(CutoffService)
        .processManual({ deliveryDate: DATE }, fx.staffId);
    } finally {
      spy.mockRestore();
    }
    await app
      .get(InvoiceCreationService)
      .createInvoice({ companyId: fx.companyId, orderIds: [a.id] }, fx.staffId);
    invoicedOrder = a.id;
    uninvoicedOrder = b.id;

    agent = request.agent(app.getHttpServer());
    await agent
      .post('/auth/login')
      .send({ email: testEmail('bq-reader'), password: PASSWORD })
      .expect(200);
  }, 600_000);

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

  it('GET /dishes?isActive=false returns only inactive dishes', async () => {
    const res = await agent
      .get('/dishes?isActive=false&search=TEST-BQ')
      .expect(200);
    const ids = res.body.data.map((d: { id: string }) => d.id);
    expect(ids).toContain(fx.hiddenDishId);
    expect(ids).not.toContain(fx.bowlId);
    expect(res.body.data.every((d: { isActive: boolean }) => !d.isActive)).toBe(
      true,
    );
    const active = await agent
      .get('/dishes?isActive=1&search=TEST-BQ')
      .expect(200);
    expect(active.body.data.map((d: { id: string }) => d.id)).toEqual([
      fx.bowlId,
    ]);
  });

  it('GET /orders?invoiced=false returns only uninvoiced orders', async () => {
    const res = await agent
      .get(`/orders?invoiced=false&companyId=${fx.companyId}`)
      .expect(200);
    const ids = res.body.data.map((o: { id: string }) => o.id);
    expect(ids).toEqual([uninvoicedOrder]);
    expect(
      res.body.data.every(
        (o: { invoiceOrder: unknown }) => o.invoiceOrder === null,
      ),
    ).toBe(true);
    const invoiced = await agent
      .get(`/orders?invoiced=true&companyId=${fx.companyId}`)
      .expect(200);
    expect(invoiced.body.data.map((o: { id: string }) => o.id)).toEqual([
      invoicedOrder,
    ]);
  });

  it('rejects anything other than true/false/1/0 with 400', async () => {
    const res = await agent.get('/orders?invoiced=maybe').expect(400);
    expect(JSON.stringify(res.body.message)).toContain(
      'invoiced must be true, false, 1 or 0.',
    );
  });
});
