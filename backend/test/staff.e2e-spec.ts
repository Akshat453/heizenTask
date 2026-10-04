import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
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

/** Staff management over real HTTP on TEST-* fixtures (test database only). */
const PASSWORD = 'Fixture@1234';

describe('Staff management (e2e)', { timeout: 300_000 }, () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const createdPermissionIds: string[] = [];
  const adminId = testId('STAFF:admin');
  const kitchenRoleId = testId('STAFF:kitchen-role');
  const opsEmail = testEmail('staff-ops');
  const adminEmail = testEmail('staff-admin');

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

    const passwordHash = await bcrypt.hash(PASSWORD, 4);
    await prisma.role.create({
      data: {
        id: testId('STAFF:admin-role'),
        name: testName('STAFF-ADMIN'),
        description: 'Test staff admins',
        permissions: {
          create: [{ permissionId: await permission('staff.manage') }],
        },
      },
    });
    await prisma.role.create({
      data: {
        id: kitchenRoleId,
        name: testName('STAFF-KITCHEN'),
        description: 'Test kitchen',
        permissions: {
          create: [{ permissionId: await permission('kitchen.read') }],
        },
      },
    });
    await prisma.staffUser.createMany({
      data: [
        {
          id: adminId,
          name: testName('STAFF-ADMIN'),
          email: adminEmail,
          passwordHash,
          roleId: testId('STAFF:admin-role'),
        },
        {
          id: testId('STAFF:ops'),
          name: testName('STAFF-OPS'),
          email: opsEmail,
          passwordHash,
          roleId: kitchenRoleId,
        },
      ],
    });
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

  const login = async (email: string, password = PASSWORD) => {
    const agent = request.agent(app.getHttpServer());
    await agent.post('/auth/login').send({ email, password }).expect(200);
    return agent;
  };

  it('lets an admin create a kitchen user who can then sign in', async () => {
    const admin = await login(adminEmail);
    const newEmail = testEmail('staff-new-cook');
    const created = await admin
      .post('/staff')
      .send({
        name: testName('NEW-COOK'),
        email: newEmail.toUpperCase(),
        roleId: kitchenRoleId,
        password: 'Kitchen@2026',
      })
      .expect(201);
    expect(created.body).toMatchObject({
      email: newEmail,
      isActive: true,
      role: { id: kitchenRoleId },
    });
    expect(created.body).not.toHaveProperty('passwordHash');

    // Same email in another case is a conflict.
    await admin
      .post('/staff')
      .send({
        name: testName('DUP'),
        email: newEmail,
        roleId: kitchenRoleId,
        password: 'Kitchen@2026',
      })
      .expect(409);

    const cook = await login(newEmail, 'Kitchen@2026');
    const me = await cook.get('/auth/me').expect(200);
    expect(me.body.permissions).toEqual(['kitchen.read']);

    // Deactivated accounts can no longer sign in.
    await admin
      .patch(`/staff/${created.body.id}`)
      .send({ isActive: false })
      .expect(200);
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: newEmail, password: 'Kitchen@2026' })
      .expect(401);

    const list = await admin.get('/staff?search=new-cook').expect(200);
    expect(list.body.pagination.totalItems).toBe(1);
    expect(list.body.data[0]).not.toHaveProperty('passwordHash');
  });

  it('stops an admin deactivating themselves', async () => {
    const admin = await login(adminEmail);
    const response = await admin
      .patch(`/staff/${adminId}`)
      .send({ isActive: false })
      .expect(409);
    expect(response.body.message).toBe(
      'You cannot deactivate your own account.',
    );
  });

  it('returns 403 to a signed-in user without staff.manage', async () => {
    const ops = await login(opsEmail);
    await ops.get('/staff').expect(403);
    await ops.get('/roles').expect(403);
    await ops
      .post('/staff')
      .send({
        name: 'x',
        email: testEmail('staff-forbidden'),
        roleId: kitchenRoleId,
        password: 'Kitchen@2026',
      })
      .expect(403);
  });
});
