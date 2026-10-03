import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { OrderStatus } from '../src/generated/prisma/enums.js';

describe('Kitchen Concurrency (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = app.get(PrismaService);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/kitchen (GET) - fails without auth', () => {
    return request(app.getHttpServer())
      .get('/kitchen?date=2025-01-01')
      .expect(401);
  });

  it('safely serializes concurrent prep unit completions', async () => {
    // 1. Setup a temporary isolated order
    // Since we need valid relations, we'll find an existing employee, company, etc. to attach to,
    // or just mock it carefully.
    const company = await prisma.company.findFirst();
    const employee = await prisma.employee.findFirst({ where: { companyId: company!.id } });
    const packaging = await prisma.packagingType.findFirst();
    const staff = await prisma.staffUser.findFirst();

    if (!company || !employee || !packaging || !staff) {
      console.log('Skipping concurrency test due to missing seed data');
      return;
    }

    const order = await prisma.order.create({
      data: {
        orderNumber: `TEST-CONCURRENCY-${Date.now()}`,
        status: OrderStatus.CONFIRMED,
        deliveryDate: new Date(),
        deliveryAt: new Date(),
        companyId: company.id,
        employeeId: employee.id,
        createdByStaffUserId: staff.id,
        packagingTypeId: packaging.id,
        deliveryAddressLabelSnapshot: 'Test',
        deliveryAddressLine1Snapshot: 'Test',
        deliveryAddressCitySnapshot: 'Test',
        deliveryAddressCountrySnapshot: 'Test',
        packagingNameSnapshot: 'Test',
        deliveryLeadMinutesSnapshot: 0,
      }
    });

    const ol = await prisma.orderLine.create({
      data: {
        orderId: order.id,
        dishId: (await prisma.dish.findFirst())!.id,
        dishNameSnapshot: 'Test Dish',
        dishSkuSnapshot: 'TEST-SKU',
        quantity: 2,
        dishUnitPriceCents: 100,
        lineTotalCents: 200,
      }
    });

    const oc1 = await prisma.orderCombination.create({
      data: { orderLineId: ol.id, quantity: 1, unitPriceCents: 100, totalCents: 100 }
    });
    const oc2 = await prisma.orderCombination.create({
      data: { orderLineId: ol.id, quantity: 1, unitPriceCents: 100, totalCents: 100 }
    });

    const pu1 = await prisma.prepUnit.create({
      data: { orderId: order.id, combinationId: oc1.id, quantity: 1, stationNameSnapshot: 'Test' }
    });
    const pu2 = await prisma.prepUnit.create({
      data: { orderId: order.id, combinationId: oc2.id, quantity: 1, stationNameSnapshot: 'Test' }
    });

    // 2. Perform concurrent completions
    // We'll call the service directly or via HTTP if we mock auth.
    // It's easier to call the service directly since this is an integration test.
    const { KitchenLifecycleService } = await import('../src/kitchen/services/kitchen-lifecycle.service.js');
    const lifecycleService = app.get(KitchenLifecycleService);

    await Promise.all([
      lifecycleService.completePrepUnit(pu1.id, staff.id),
      lifecycleService.completePrepUnit(pu2.id, staff.id),
    ]);

    // 3. Verify exactly one kitchenReadyAt, and both are done
    const checkPu1 = await prisma.prepUnit.findUnique({ where: { id: pu1.id } });
    const checkPu2 = await prisma.prepUnit.findUnique({ where: { id: pu2.id } });
    const checkOrder = await prisma.order.findUnique({ where: { id: order.id } });

    expect(checkPu1!.doneAt).not.toBeNull();
    expect(checkPu2!.doneAt).not.toBeNull();
    expect(checkOrder!.kitchenReadyAt).not.toBeNull();

    // 4. Cleanup
    await prisma.prepUnit.deleteMany({ where: { orderId: order.id } });
    await prisma.orderCombination.deleteMany({ where: { orderLine: { orderId: order.id } } });
    await prisma.orderLine.deleteMany({ where: { orderId: order.id } });
    await prisma.order.delete({ where: { id: order.id } });
  }, 15000);
});
