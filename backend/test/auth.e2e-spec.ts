import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { configureApp } from '../src/app.setup.js';
import { AppModule } from '../src/app.module.js';

const TEST_PASSWORD = 'Test@1234';

type ExpectedAccount = {
  email: string;
  role: string;
  includes: string[];
  excludes?: string[];
};

const accounts: ExpectedAccount[] = [
  {
    email: 'admin@test.com',
    role: 'ADMIN',
    includes: ['staff.manage', 'catalogue.manage', 'orders.override'],
  },
  {
    email: 'kitchen@test.com',
    role: 'KITCHEN',
    includes: ['catalogue.read', 'kitchen.read', 'kitchen.update'],
    excludes: ['staff.manage', 'orders.override'],
  },
  {
    email: 'dispatch@test.com',
    role: 'DISPATCH',
    includes: ['dispatch.read', 'dispatch.update', 'dispatch.assign_driver'],
    excludes: ['staff.manage'],
  },
  {
    email: 'driver@test.com',
    role: 'DRIVER',
    includes: ['driver.own_drops.read', 'driver.own_drops.deliver'],
    excludes: ['dispatch.update', 'staff.manage'],
  },
];

describe('Authentication (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
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

  it('rejects a wrong password without revealing account existence', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin@test.com', password: 'wrong-password' })
      .expect(401);

    expect(response.body.message).toBe('Invalid email or password.');
  });

  it('sets a host-only HttpOnly cookie and returns no password hash', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: '  ADMIN@test.com ', password: TEST_PASSWORD })
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

  it.each(accounts)(
    'authenticates $email with the expected database permissions',
    async ({ email, role, includes, excludes = [] }) => {
      const agent = request.agent(app.getHttpServer());
      const loginResponse = await agent
        .post('/auth/login')
        .send({ email, password: TEST_PASSWORD })
        .expect(200);

      expect(loginResponse.body).toMatchObject({ email, role });
      const meResponse = await agent.get('/auth/me').expect(200);
      expect(meResponse.body).toMatchObject({ email, role });
      expect(meResponse.body).not.toHaveProperty('passwordHash');
      expect(meResponse.body.permissions).toEqual(
        expect.arrayContaining(includes),
      );
      for (const permission of excludes) {
        expect(meResponse.body.permissions).not.toContain(permission);
      }
      if (role === 'DRIVER') {
        expect(meResponse.body.permissions).toEqual([
          'driver.own_drops.deliver',
          'driver.own_drops.read',
        ]);
      }
    },
  );

  it('clears the browser cookie on logout and is idempotent', async () => {
    const agent = request.agent(app.getHttpServer());
    await agent
      .post('/auth/login')
      .send({ email: 'admin@test.com', password: TEST_PASSWORD })
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
