import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { KitchenLifecycleService } from '../src/kitchen/services/kitchen-lifecycle.service.js';
import {
  cleanupTestData,
  createConfirmedOrderFixture,
} from './support/fixtures.js';

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
    await cleanupTestData(prisma);
  });

  afterAll(async () => {
    await cleanupTestData(prisma);
    await app.close();
  });

  it('/kitchen (GET) - fails without auth', () => {
    return request(app.getHttpServer())
      .get('/kitchen?date=2025-01-01')
      .expect(401);
  });

  it('safely serializes concurrent prep unit completions', async () => {
    const fixture = await createConfirmedOrderFixture(
      prisma,
      'KITCHEN-CONCURRENCY',
      { prepUnitCount: 2 },
    );
    const lifecycleService = app.get(KitchenLifecycleService);

    await Promise.all(
      fixture.prepUnitIds.map((prepUnitId) =>
        lifecycleService.completePrepUnit(prepUnitId, fixture.staffUserId),
      ),
    );

    const prepUnits = await prisma.prepUnit.findMany({
      where: { orderId: fixture.orderId },
    });
    const order = await prisma.order.findUniqueOrThrow({
      where: { id: fixture.orderId },
    });

    expect(prepUnits).toHaveLength(2);
    expect(prepUnits.every((unit) => unit.doneAt !== null)).toBe(true);
    expect(order.kitchenReadyAt).not.toBeNull();
  }, 15000);
});
