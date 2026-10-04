import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { configureApp } from '../src/app.setup.js';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import {
  cleanupTestData,
  testEmail,
  testId,
  testName,
} from './support/fixtures.js';

/**
 * Authentication against TEST-* fixture accounts on the isolated test database.
 * (The seeded reviewer accounts and their role/permission matrix are verified
 * against the development database by prisma/verify-seed.ts.)
 */
const PASSWORD = 'Fixture@1234';
const DRIVER_PERMISSIONS = [
  'driver.own_drops.deliver',
  'driver.own_drops.read',
];
const OPS_PERMISSIONS = ['dispatch.read', 'dispatch.update'];

describe('Authentication (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const createdPermissionIds: string[] = [];
  const opsEmail = testEmail('auth-ops');
  const driverEmail = testEmail('auth-driver');
  const inactiveEmail = testEmail('auth-inactive');

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);
    await cleanupTestData(prisma);

    const permissionIds = new Map<string, string>();
    for (const key of [...DRIVER_PERMISSIONS, ...OPS_PERMISSIONS]) {
      const existing = await prisma.permission.findUnique({ where: { key } });
      const permission =
        existing ??
        (await prisma.permission.create({
          data: { key, description: 'Test fixture permission' },
        }));
      if (!existing) createdPermissionIds.push(permission.id);
      permissionIds.set(key, permission.id);
    }
    const passwordHash = await bcrypt.hash(PASSWORD, 4);
    const account = async (
      key: string,
      roleName: string,
      email: string,
      permissions: string[],
      isActive = true,
    ) => {
      const roleId = testId(`AUTH:${key}-role`);
      await prisma.role.create({
        data: {
          id: roleId,
          name: roleName,
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
          id: testId(`AUTH:${key}`),
          name: testName(`AUTH-${key}`),
          email,
          passwordHash,
          roleId,
          isActive,
        },
      });
    };
    await account('ops', testName('AUTH-OPS'), opsEmail, OPS_PERMISSIONS);
    await account(
      'driver',
      testName('AUTH-DRIVER'),
      driverEmail,
      DRIVER_PERMISSIONS,
    );
    await account(
      'inactive',
      testName('AUTH-INACTIVE'),
      inactiveEmail,
      OPS_PERMISSIONS,
      false,
    );
  });

  afterAll(async () => {
    try {
      await cleanupTestData(prisma);
      if (createdPermissionIds.length)
        await prisma.permission.deleteMany({
          where: { id: { in: createdPermissionIds } },
        });
    } finally {
      await app.close();
    }
  });

  it('rejects unauthenticated /auth/me requests', async () => {
    await request(app.getHttpServer()).get('/auth/me').expect(401);
  });

  it('rejects malformed login bodies', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'not-an-email', unexpected: true })
      .expect(400);
  });

  it('rejects a wrong password or inactive account without revealing account existence', async () => {
    const wrong = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: opsEmail, password: 'wrong-password' })
      .expect(401);
    expect(wrong.body.message).toBe('Invalid email or password.');
    const inactive = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: inactiveEmail, password: PASSWORD })
      .expect(401);
    expect(inactive.body.message).toBe('Invalid email or password.');
  });

  it('sets a host-only HttpOnly cookie, normalizes the email and returns no password hash', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: `  ${opsEmail.toUpperCase()} `, password: PASSWORD })
      .expect(200);

    const cookies = response.headers['set-cookie'];
    expect(cookies).toBeDefined();
    const cookie = Array.isArray(cookies) ? cookies[0] : cookies;
    expect(cookie).toContain('heizen_access_token=');
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('Path=/');
    expect(cookie).toContain('SameSite=Lax');
    expect(cookie).not.toContain('Domain=');
    expect(response.body).not.toHaveProperty('passwordHash');
  });

  it('exposes exactly the role permissions from the database on /auth/me', async () => {
    const agent = request.agent(app.getHttpServer());
    await agent
      .post('/auth/login')
      .send({ email: driverEmail, password: PASSWORD })
      .expect(200);
    const me = await agent.get('/auth/me').expect(200);
    expect(me.body).toMatchObject({
      email: driverEmail,
      role: 'TEST-AUTH-DRIVER',
    });
    expect(me.body).not.toHaveProperty('passwordHash');
    expect(
      [...me.body.permissions].sort((a: string, b: string) =>
        a.localeCompare(b),
      ),
    ).toEqual(DRIVER_PERMISSIONS);
  });

  it('clears the browser cookie on logout and is idempotent', async () => {
    const agent = request.agent(app.getHttpServer());
    await agent
      .post('/auth/login')
      .send({ email: opsEmail, password: PASSWORD })
      .expect(200);
    await agent.get('/auth/me').expect(200);

    const logoutResponse = await agent.post('/auth/logout').expect(200);
    const cookies = logoutResponse.headers['set-cookie'];
    const cookie = Array.isArray(cookies) ? cookies[0] : cookies;
    expect(cookie).toContain('heizen_access_token=;');
    expect(cookie).toContain('Expires=Thu, 01 Jan 1970 00:00:00 GMT');
    await agent.get('/auth/me').expect(401);
    await agent.post('/auth/logout').expect(200, { success: true });
  });
});
