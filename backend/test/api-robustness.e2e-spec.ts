import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app.setup.js';
import { AUTH_COOKIE_NAME } from '../src/auth/auth-cookie.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import {
  cleanupTestData,
  testEmail,
  testId,
  testName,
} from './support/fixtures.js';
import { ensurePlatformSettings } from './support/ordering-fixture.js';

const OPS_PERMISSIONS = [
  'dispatch.read',
  'catalogue.read',
  'catalogue.manage',
  'settings.manage',
  'settings.read',
];
const DRIVER_PERMISSIONS = ['driver.own_drops.read'];

describe('HTTP boundary semantics (PostgreSQL)', { timeout: 300_000 }, () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let restoreSettings: () => Promise<void>;
  const createdPermissionIds: string[] = [];
  let opsCookie: string;
  let driverCookie: string;
  const http = () => request(app.getHttpServer());

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

    const permissionIds = new Map<string, string>();
    for (const key of [...OPS_PERMISSIONS, ...DRIVER_PERMISSIONS]) {
      const existing = await prisma.permission.findUnique({ where: { key } });
      const permission =
        existing ??
        (await prisma.permission.create({
          data: { key, description: 'Test fixture permission' },
        }));
      if (!existing) createdPermissionIds.push(permission.id);
      permissionIds.set(key, permission.id);
    }
    const user = async (key: string, permissions: string[]) => {
      const roleId = testId(`HTTP:${key}-role`);
      const userId = testId(`HTTP:${key}`);
      await prisma.role.create({
        data: {
          id: roleId,
          name: testName(`HTTP-${key}`),
          description: 'Test role',
          permissions: {
            create: permissions.map((name) => ({
              permissionId: permissionIds.get(name)!,
            })),
          },
        },
      });
      await prisma.staffUser.create({
        data: {
          id: userId,
          name: testName(`HTTP-${key}`),
          email: testEmail(`http-${key}`),
          passwordHash: 'x',
          roleId,
        },
      });
      return `${AUTH_COOKIE_NAME}=${await app.get(JwtService).signAsync({ sub: userId })}`;
    };
    opsCookie = await user('ops', OPS_PERMISSIONS);
    driverCookie = await user('driver', DRIVER_PERMISSIONS);
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

  it('401 (unauthenticated) takes precedence over 403 and over input validation', async () => {
    await http().get('/dispatch/drops/not-a-uuid/proof-url').expect(401);
    await http().get('/options?pageSize=1000').expect(401);
  });

  it('403 when authenticated without the permission, before input validation', async () => {
    await http()
      .get(`/dispatch/drops/${testId('missing-drop')}/proof-url`)
      .set('Cookie', driverCookie)
      .expect(403);
    await http()
      .get('/dispatch/drops/not-a-uuid/proof-url')
      .set('Cookie', driverCookie)
      .expect(403);
  });

  it('400 for malformed UUIDs, 404 for missing resources (proof URL derives the key from the Drop only)', async () => {
    await http()
      .get('/dispatch/drops/not-a-uuid/proof-url')
      .set('Cookie', opsCookie)
      .expect(400);
    await http()
      .get(`/dispatch/drops/${testId('missing-drop')}/proof-url`)
      .set('Cookie', opsCookie)
      .expect(404);
    await http()
      .patch('/allergens/1%20OR%201=1')
      .set('Cookie', opsCookie)
      .send({ name: 'x' })
      .expect(400);
    await http()
      .get('/business-time/cutoff/2026-10-05T00:00:00Z')
      .set('Cookie', opsCookie)
      .expect(400);
  });

  it('409 for duplicates; Prisma internals are not exposed', async () => {
    await http()
      .post('/allergens')
      .set('Cookie', opsCookie)
      .send({ name: testName('HTTP-SESAME') })
      .expect(201);
    const duplicate = await http()
      .post('/allergens')
      .set('Cookie', opsCookie)
      .send({ name: testName('HTTP-SESAME') })
      .expect(409);
    expect(JSON.stringify(duplicate.body)).not.toMatch(
      /Prisma|P2002|constraint/i,
    );
  });

  it('returns the standard paginated contract with defaults and a 100 cap', async () => {
    const page = await http()
      .get('/allergens')
      .set('Cookie', opsCookie)
      .expect(200);
    expect(page.body).toMatchObject({
      data: expect.any(Array),
      pagination: {
        page: 1,
        pageSize: 20,
        totalItems: expect.any(Number),
        totalPages: expect.any(Number),
      },
    });
    await http()
      .get('/options?pageSize=100')
      .set('Cookie', opsCookie)
      .expect(200);
    await http()
      .get('/options?pageSize=101')
      .set('Cookie', opsCookie)
      .expect(400);
    for (const path of [
      '/menu/categories',
      '/dispatch/drops',
      '/kitchen-stations',
      '/packaging-types',
      '/portion-sizes',
      '/dietary-tags',
      '/options',
    ]) {
      const response = await http()
        .get(`${path}?page=1&pageSize=5`)
        .set('Cookie', opsCookie)
        .expect(200);
      expect(response.body.pagination).toMatchObject({ page: 1, pageSize: 5 });
    }
  });

  it('settings accept zero values and reject duplicate or empty Kitchen calendars', async () => {
    const before = await prisma.platformSettings.findUniqueOrThrow({
      where: { id: 1 },
    });
    const days = (await prisma.kitchenWorkingDay.findMany()).map(
      ({ dayOfWeek }) => dayOfWeek,
    );
    try {
      const updated = await http()
        .put('/settings')
        .set('Cookie', opsCookie)
        .send({ atRiskWindowMinutes: 0, cutoffWorkingDayCount: 0 })
        .expect(200);
      expect(updated.body).toMatchObject({
        atRiskWindowMinutes: 0,
        cutoffWorkingDayCount: 0,
      });
      await http()
        .put('/settings')
        .set('Cookie', opsCookie)
        .send({ atRiskWindowMinutes: 241 })
        .expect(400);
      await http()
        .put('/settings/working-days')
        .set('Cookie', opsCookie)
        .send({ days: ['MONDAY', 'MONDAY'] })
        .expect(400);
      await http()
        .put('/settings/working-days')
        .set('Cookie', opsCookie)
        .send({ days: [] })
        .expect(400);
      expect(
        (await prisma.kitchenWorkingDay.findMany())
          .map(({ dayOfWeek }) => dayOfWeek)
          .sort(),
      ).toEqual([...days].sort());
    } finally {
      await prisma.platformSettings.update({
        where: { id: 1 },
        data: {
          atRiskWindowMinutes: before.atRiskWindowMinutes,
          cutoffWorkingDayCount: before.cutoffWorkingDayCount,
        },
      });
    }
  });
});
