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
import { CLOUDINARY_SDK } from '../src/driver/services/cloudinary-sdk.js';
import { DeliveryDropStatus } from '../src/generated/prisma/enums.js';
import { KitchenLifecycleService } from '../src/kitchen/services/kitchen-lifecycle.service.js';
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
 * Delivery proofs over real HTTP on TEST_DATABASE_URL with the Cloudinary SDK
 * boundary faked (no live credentials). One app has a fake SDK; the other is
 * the plain AppModule without CLOUDINARY_* config.
 */
const DATE = '2099-12-08';
const AFTER_CUTOFF = Temporal.Instant.from('2100-01-01T00:00:00Z');
const PASSWORD = 'Fixture@1234';
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);

const fakeSdk = {
  uploader: {
    upload_stream: vi.fn(
      (
        options: { public_id: string },
        callback: (e?: unknown, r?: unknown) => void,
      ) => ({
        end: () =>
          callback(undefined, {
            public_id: options.public_id,
            format: 'jpg',
            type: 'authenticated',
          }),
      }),
    ),
    destroy: vi.fn().mockResolvedValue({ result: 'ok' }),
  },
  utils: {
    private_download_url: vi.fn(
      () => 'https://api.cloudinary.com/v1_1/test/image/download?signed',
    ),
  },
};

describe(
  'Delivery proof photos (e2e, storage mocked)',
  { timeout: 600_000 },
  () => {
    let withSdk: INestApplication<App>;
    let withoutConfig: INestApplication<App>;
    let prisma: PrismaService;
    let fx: OrderingFixture;
    let restoreSettings: () => Promise<void>;
    const createdPermissionIds: string[] = [];
    const driverId = testId('PROOF:driver');
    const drops: string[] = [];

    const boot = async (sdk: unknown) => {
      const builder = Test.createTestingModule({ imports: [AppModule] });
      if (sdk !== undefined)
        builder.overrideProvider(CLOUDINARY_SDK).useValue(sdk);
      const app = (await builder.compile()).createNestApplication<
        INestApplication<App>
      >();
      configureApp(app);
      await app.init();
      return app;
    };
    const login = async (app: INestApplication<App>, key: string) => {
      const agent = request.agent(app.getHttpServer());
      await agent
        .post('/auth/login')
        .send({ email: testEmail(key), password: PASSWORD })
        .expect(200);
      return agent;
    };

    beforeAll(async () => {
      withSdk = await boot(fakeSdk);
      withoutConfig = await boot(undefined); // the real provider: no CLOUDINARY_* in the test env
      prisma = withSdk.get(PrismaService);
      await cleanupTestData(prisma);
      restoreSettings = await ensurePlatformSettings(prisma);
      fx = await createOrderingFixture(prisma, 'PROOF');
      await prisma.employee.update({
        where: { id: fx.employeeId },
        data: { canChangeDeliveryTime: true },
      });

      const passwordHash = await bcrypt.hash(PASSWORD, 4);
      const role = async (key: string, permissions: string[]) => {
        const ids: string[] = [];
        for (const p of permissions) {
          const existing = await prisma.permission.findUnique({
            where: { key: p },
          });
          const permission =
            existing ??
            (await prisma.permission.create({
              data: { key: p, description: 'Test' },
            }));
          if (!existing) createdPermissionIds.push(permission.id);
          ids.push(permission.id);
        }
        await prisma.role.create({
          data: {
            id: testId(`PROOF:${key}-role`),
            name: testName(`PROOF-${key}`),
            description: 'Test',
            permissions: {
              create: ids.map((permissionId) => ({ permissionId })),
            },
          },
        });
        return testId(`PROOF:${key}-role`);
      };
      await prisma.staffUser.create({
        data: {
          id: driverId,
          name: testName('PROOF-DRIVER'),
          email: testEmail('proof-driver'),
          passwordHash,
          roleId: await role('driver', [
            'driver.own_drops.read',
            'driver.own_drops.deliver',
          ]),
        },
      });
      await prisma.staffUser.create({
        data: {
          id: testId('PROOF:dispatch'),
          name: testName('PROOF-DISPATCH'),
          email: testEmail('proof-dispatch'),
          passwordHash,
          roleId: await role('dispatch', ['dispatch.read']),
        },
      });

      // Four out-for-delivery drops (distinct delivery times → distinct drops).
      const orders = withSdk.get(OrderCreationService);
      const ids: string[] = [];
      for (const time of ['11:00', '12:00', '13:00', '14:00']) {
        const order = await orders.create(
          {
            employeeId: fx.employeeId,
            deliveryDate: DATE,
            placeOrder: true,
            deliveryTime: time,
            lines: [
              {
                dishId: fx.bowlId,
                quantity: 1,
                combinations: [
                  {
                    quantity: 1,
                    options: [
                      {
                        optionGroupId: fx.proteinGroupId,
                        optionId: fx.paneerId,
                      },
                    ],
                  },
                ],
              },
            ],
          },
          fx.staffId,
        );
        ids.push(order.id);
      }
      const spy = vi
        .spyOn(withSdk.get(BusinessTimeService), 'now')
        .mockReturnValue(AFTER_CUTOFF);
      try {
        await withSdk
          .get(CutoffService)
          .processManual({ deliveryDate: DATE }, fx.staffId);
      } finally {
        spy.mockRestore();
      }
      const dispatch = withSdk.get(DispatchLifecycleService);
      for (const id of ids) {
        await withSdk
          .get(KitchenLifecycleService)
          .forceCompleteOrder(id, fx.staffId);
        const { deliveryDropId } = await prisma.order.findUniqueOrThrow({
          where: { id },
        });
        await dispatch.assignDriver(deliveryDropId!, driverId, fx.staffId);
        await dispatch.outForDelivery(deliveryDropId!, fx.staffId);
        drops.push(deliveryDropId!);
      }
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
        await withSdk.close();
        await withoutConfig.close();
      }
    }, 120_000);

    it('without config: the app boots, a photo delivery is 503 and leaves the drop unchanged', async () => {
      const driver = await login(withoutConfig, 'proof-driver');
      const res = await driver
        .post(`/driver/drops/${drops[0]}/deliver`)
        .field('note', 'With photo')
        .attach('photo', JPEG, 'p.jpg')
        .expect(503);
      expect(res.body.message).toBe('Photo upload is not configured');
      const drop = await prisma.deliveryDrop.findUniqueOrThrow({
        where: { id: drops[0]! },
      });
      expect(drop).toMatchObject({
        status: DeliveryDropStatus.OUT_FOR_DELIVERY,
        photoUrl: null,
        deliveredAt: null,
      });
    });

    it('without config: note-only delivery succeeds', async () => {
      const driver = await login(withoutConfig, 'proof-driver');
      const res = await driver
        .post(`/driver/drops/${drops[0]}/deliver`)
        .field('note', 'Left at reception')
        .expect(201);
      expect(res.body).toMatchObject({
        status: 'DELIVERED',
        deliveryNote: 'Left at reception',
        photoUrl: null,
      });
      const dispatcher = await login(withoutConfig, 'proof-dispatch');
      await dispatcher.get(`/dispatch/drops/${drops[0]}/proof-url`).expect(404);
    });

    it('with storage: stores the locator, and proof-url signs only the drop’s own asset', async () => {
      const driver = await login(withSdk, 'proof-driver');
      const res = await driver
        .post(`/driver/drops/${drops[1]}/deliver`)
        .attach('photo', JPEG, 'anything.png')
        .expect(201);
      const publicId =
        fakeSdk.uploader.upload_stream.mock.calls[0]![0].public_id;
      expect(publicId).toMatch(
        new RegExp(`^delivery-proofs/${drops[1]}/[0-9a-f-]{36}$`),
      );
      expect(res.body.photoUrl).toBe(`${publicId}.jpg`);

      const dispatcher = await login(withSdk, 'proof-dispatch');
      const url = await dispatcher
        .get(
          `/dispatch/drops/${drops[1]}/proof-url?publicId=delivery-proofs/evil&locator=evil.jpg`,
        )
        .expect(200);
      expect(url.body).toEqual({
        url: expect.stringContaining('signed'),
        expiresInSeconds: 300,
      });
      expect(fakeSdk.utils.private_download_url).toHaveBeenLastCalledWith(
        publicId,
        'jpg',
        expect.objectContaining({ type: 'authenticated', attachment: false }),
      );
    });

    it('a legacy or malformed locator is a controlled 410 "Photo unavailable"', async () => {
      await prisma.deliveryDrop.update({
        where: { id: drops[2]! },
        data: {
          status: DeliveryDropStatus.DELIVERED,
          deliveredAt: new Date(),
          photoUrl: 'proofs/legacy-s3-key.jpg',
        },
      });
      const dispatcher = await login(withSdk, 'proof-dispatch');
      const res = await dispatcher
        .get(`/dispatch/drops/${drops[2]}/proof-url`)
        .expect(410);
      expect(res.body.message).toBe('Photo unavailable');
    });

    it('rejects an oversized photo with 400 before any upload', async () => {
      const before = fakeSdk.uploader.upload_stream.mock.calls.length;
      const driver = await login(withSdk, 'proof-driver');
      const big = Buffer.concat([JPEG, Buffer.alloc(5 * 1024 * 1024)]);
      const res = await driver
        .post(`/driver/drops/${drops[3]}/deliver`)
        .attach('photo', big, 'big.jpg')
        .expect(400);
      expect(res.body.message).toBe('Photo must be 5 MB or smaller.');
      expect(fakeSdk.uploader.upload_stream.mock.calls.length).toBe(before);
    });
  },
);
