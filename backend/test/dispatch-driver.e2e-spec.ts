import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Temporal } from '@js-temporal/polyfill';
import { AppModule } from '../src/app.module.js';
import { BusinessTimeService } from '../src/business-time/business-time.service.js';
import {
  DeliveryGroupingService,
  DRIVER_DELIVER_PERMISSION,
} from '../src/dispatch/services/delivery-grouping.service.js';
import { DispatchLifecycleService } from '../src/dispatch/services/dispatch-lifecycle.service.js';
import { DispatchQueryService } from '../src/dispatch/services/dispatch-query.service.js';
import { DriverLifecycleService } from '../src/driver/services/driver-lifecycle.service.js';
import { DriverQueryService } from '../src/driver/services/driver-query.service.js';
import {
  DeliveryDropStatus,
  OrderEventType,
  OrderStatus,
} from '../src/generated/prisma/enums.js';
import { KitchenLifecycleService } from '../src/kitchen/services/kitchen-lifecycle.service.js';
import type { OrderLineDto } from '../src/orders/dto/order.dto.js';
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

const AFTER_CUTOFF = Temporal.Instant.from('2100-01-01T00:00:00Z');

describe(
  'Kitchen, Dispatch and Driver (PostgreSQL)',
  { timeout: 300_000 },
  () => {
    let moduleRef: TestingModule;
    let prisma: PrismaService;
    let orders: OrderCreationService;
    let cutoff: CutoffService;
    let kitchen: KitchenLifecycleService;
    let grouping: DeliveryGroupingService;
    let dispatch: DispatchLifecycleService;
    let dispatchQuery: DispatchQueryService;
    let driver: DriverLifecycleService;
    let driverQuery: DriverQueryService;
    let businessTime: BusinessTimeService;
    let fx: OrderingFixture;
    let restoreSettings: () => Promise<void>;
    let createdPermissionId: string | null = null;
    const driverA = testId('DISPATCH:driver-a');
    const driverB = testId('DISPATCH:driver-b');
    const inactiveDriver = testId('DISPATCH:driver-inactive');

    const line = (): OrderLineDto => ({
      dishId: fx.bowlId,
      quantity: 3,
      combinations: [
        {
          quantity: 2,
          options: [
            { optionGroupId: fx.proteinGroupId, optionId: fx.paneerId },
            {
              optionGroupId: fx.riceGroupId,
              optionId: fx.riceId,
              portionSizeId: fx.smallId,
            },
          ],
        },
        {
          quantity: 1,
          options: [{ optionGroupId: fx.proteinGroupId, optionId: fx.tofuId }],
        },
      ],
    });
    const confirmedOrders = async (deliveryDate: string, count: number) => {
      const ids: string[] = [];
      for (let index = 0; index < count; index++) {
        ids.push(
          (
            await orders.create(
              {
                employeeId: fx.employeeId,
                deliveryDate,
                placeOrder: true,
                lines: [line()],
              },
              fx.staffId,
            )
          ).id,
        );
      }
      const spy = vi.spyOn(businessTime, 'now').mockReturnValue(AFTER_CUTOFF);
      try {
        await cutoff.processManual({ deliveryDate }, fx.staffId);
      } finally {
        spy.mockRestore();
      }
      return ids;
    };
    const readyOrders = async (deliveryDate: string, count: number) => {
      const ids = await confirmedOrders(deliveryDate, count);
      for (const id of ids) await kitchen.forceCompleteOrder(id, fx.staffId);
      return ids;
    };
    const dropOf = async (orderId: string) =>
      (await prisma.order.findUniqueOrThrow({ where: { id: orderId } }))
        .deliveryDropId;
    const events = (orderId: string, type: OrderEventType) =>
      prisma.orderEvent.count({ where: { orderId, type } });

    beforeAll(async () => {
      moduleRef = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();
      prisma = moduleRef.get(PrismaService);
      orders = moduleRef.get(OrderCreationService);
      cutoff = moduleRef.get(CutoffService);
      kitchen = moduleRef.get(KitchenLifecycleService);
      grouping = moduleRef.get(DeliveryGroupingService);
      dispatch = moduleRef.get(DispatchLifecycleService);
      dispatchQuery = moduleRef.get(DispatchQueryService);
      driver = moduleRef.get(DriverLifecycleService);
      driverQuery = moduleRef.get(DriverQueryService);
      businessTime = moduleRef.get(BusinessTimeService);
      await cleanupTestData(prisma);
      restoreSettings = await ensurePlatformSettings(prisma);
      fx = await createOrderingFixture(prisma, 'DISPATCH');

      // Drivers are identified by the actual delivery permission, not a role name.
      let permission = await prisma.permission.findUnique({
        where: { key: DRIVER_DELIVER_PERMISSION },
      });
      if (!permission) {
        permission = await prisma.permission.create({
          data: {
            key: DRIVER_DELIVER_PERMISSION,
            description: 'Test fixture permission',
          },
        });
        createdPermissionId = permission.id;
      }
      const roleId = testId('DISPATCH:driver-role');
      await prisma.role.create({
        data: {
          id: roleId,
          name: testName('DISPATCH-DRIVER-ROLE'),
          description: 'Test drivers',
          permissions: { create: { permissionId: permission.id } },
        },
      });
      await prisma.staffUser.createMany({
        data: [
          {
            id: driverA,
            name: testName('DRIVER-A'),
            email: testEmail('dispatch-driver-a'),
            passwordHash: 'x',
            roleId,
          },
          {
            id: driverB,
            name: testName('DRIVER-B'),
            email: testEmail('dispatch-driver-b'),
            passwordHash: 'x',
            roleId,
          },
          {
            id: inactiveDriver,
            name: testName('DRIVER-OFF'),
            email: testEmail('dispatch-driver-off'),
            passwordHash: 'x',
            roleId,
            isActive: false,
          },
        ],
      });
    });

    afterEach(() => vi.restoreAllMocks());

    afterAll(async () => {
      try {
        await cleanupTestData(prisma);
        if (createdPermissionId)
          await prisma.permission.delete({
            where: { id: createdPermissionId },
          });
      } finally {
        await restoreSettings();
        await moduleRef.close();
      }
    });

    it('concurrent final PrepUnit completions set kitchenReadyAt and KITCHEN_READY exactly once', async () => {
      const [orderId] = await confirmedOrders('2099-07-10', 1);
      const units = await prisma.prepUnit.findMany({
        where: { orderId },
        orderBy: { id: 'asc' },
      });
      expect(units).toHaveLength(2);
      await kitchen.startPrepUnit(units[0]!.id, fx.staffId);

      const results = await Promise.all(
        units.map(({ id }) => kitchen.completePrepUnit(id, fx.staffId)),
      );
      expect(results.filter(({ kitchenReady }) => kitchenReady)).toHaveLength(
        1,
      );
      expect(
        results.find(({ kitchenReady }) => kitchenReady)!.dispatch,
      ).toMatchObject({ status: 'GROUPED' });

      const order = await prisma.order.findUniqueOrThrow({
        where: { id: orderId! },
        include: { prepUnits: true },
      });
      expect(order.kitchenReadyAt).not.toBeNull();
      expect(order.kitchenStartedAt).not.toBeNull();
      expect(
        order.prepUnits.every(
          (unit) =>
            unit.doneAt &&
            unit.startedAt &&
            unit.doneByStaffUserId &&
            unit.startedByStaffUserId,
        ),
      ).toBe(true);
      expect(await events(orderId!, OrderEventType.KITCHEN_STARTED)).toBe(1);
      expect(await events(orderId!, OrderEventType.KITCHEN_READY)).toBe(1);
      expect(await events(orderId!, OrderEventType.DISPATCH_READY)).toBe(1);
      await expect(
        kitchen.completePrepUnit(units[0]!.id, fx.staffId),
      ).rejects.toThrow(ConflictException);
    });

    describe('grouping, dispatch and delivery', () => {
      const date = '2099-07-11';
      let group: string[];
      let departedDropId: string;

      it('concurrent grouping of a key yields one mutable Drop; reconciliation is idempotent', async () => {
        const handOff = vi
          .spyOn(grouping, 'ensureReadyDropForOrder')
          .mockResolvedValue({ dropId: null });
        group = await readyOrders(date, 3);
        handOff.mockRestore();
        expect(await Promise.all(group.map(dropOf))).toEqual([
          null,
          null,
          null,
        ]);

        const results = await Promise.allSettled([
          ...group.map((id) => grouping.ensureReadyDropForOrder(id)),
          grouping.reconcileAll(),
        ]);
        expect(results.filter(({ status }) => status === 'rejected')).toEqual(
          [],
        );
        const dropIds = new Set(await Promise.all(group.map(dropOf)));
        expect(dropIds.size).toBe(1);
        departedDropId = [...dropIds][0]!;
        expect(
          await prisma.deliveryDrop.count({
            where: {
              companyId: fx.companyId,
              scheduledDeliveryAt: (
                await prisma.order.findUniqueOrThrow({
                  where: { id: group[0]! },
                })
              ).deliveryAt,
            },
          }),
        ).toBe(1);

        const again = await grouping.reconcileAll();
        expect(again).toMatchObject({
          unattachedReadyOrdersFound: 0,
          failures: [],
        });
        for (const id of group)
          expect(await events(id, OrderEventType.DISPATCH_READY)).toBe(1);
      });

      it('assignDriver validates capability/state and survives concurrent assignment', async () => {
        await expect(
          dispatch.assignDriver(departedDropId, fx.staffId, fx.staffId),
        ).rejects.toThrow(BadRequestException); // no delivery permission
        await expect(
          dispatch.assignDriver(departedDropId, inactiveDriver, fx.staffId),
        ).rejects.toThrow(BadRequestException);
        await expect(
          dispatch.assignDriver(departedDropId, testId('nobody'), fx.staffId),
        ).rejects.toThrow(NotFoundException);

        const results = await Promise.allSettled([
          dispatch.assignDriver(departedDropId, driverA, fx.staffId),
          dispatch.assignDriver(departedDropId, driverB, fx.staffId),
        ]);
        expect(results.every(({ status }) => status === 'fulfilled')).toBe(
          true,
        );
        expect([driverA, driverB]).toContain(
          (
            await prisma.deliveryDrop.findUniqueOrThrow({
              where: { id: departedDropId },
            })
          ).driverStaffUserId,
        );
        await dispatch.assignDriver(departedDropId, driverA, fx.staffId);
      });

      it('concurrent OUT_FOR_DELIVERY: one succeeds, the other is a clean 409; departed Drops are immutable', async () => {
        const results = await Promise.allSettled([
          dispatch.outForDelivery(departedDropId, fx.staffId),
          dispatch.outForDelivery(departedDropId, fx.staffId),
        ]);
        expect(
          results.filter(({ status }) => status === 'fulfilled'),
        ).toHaveLength(1);
        expect(
          (
            results.find(
              ({ status }) => status === 'rejected',
            ) as PromiseRejectedResult
          ).reason,
        ).toBeInstanceOf(ConflictException);
        for (const id of group)
          expect(await events(id, OrderEventType.OUT_FOR_DELIVERY)).toBe(1);
        await expect(
          dispatch.assignDriver(departedDropId, driverB, fx.staffId),
        ).rejects.toThrow(ConflictException);

        // A late-ready matching Order never joins the departed Drop.
        const [late] = await readyOrders(date, 1);
        const lateDrop = await dropOf(late!);
        expect(lateDrop).not.toBeNull();
        expect(lateDrop).not.toBe(departedDropId);
        expect(
          await prisma.order.count({
            where: { deliveryDropId: departedDropId },
          }),
        ).toBe(3);
        await expect(
          dispatch.outForDelivery(lateDrop!, fx.staffId),
        ).rejects.toThrow(/without an assigned driver/);
      });

      it('only the assigned Driver can deliver; concurrent delivery keeps the first deliveredAt and delivers Orders once', async () => {
        await expect(
          driver.markDelivered(departedDropId, driverB),
        ).rejects.toThrow(NotFoundException);
        const before = await prisma.order.findMany({
          where: { id: { in: group } },
          select: { id: true, billableTotalCents: true },
        });

        const results = await Promise.allSettled([
          driver.markDelivered(departedDropId, driverA, 'Left at reception'),
          driver.markDelivered(departedDropId, driverA),
        ]);
        expect(
          results.filter(({ status }) => status === 'fulfilled'),
        ).toHaveLength(1);
        expect(
          (
            results.find(
              ({ status }) => status === 'rejected',
            ) as PromiseRejectedResult
          ).reason,
        ).toBeInstanceOf(ConflictException);
        const delivered = await prisma.deliveryDrop.findUniqueOrThrow({
          where: { id: departedDropId },
        });
        expect(delivered.status).toBe(DeliveryDropStatus.DELIVERED);
        expect(delivered.deliveredAt).not.toBeNull();

        await expect(
          driver.markDelivered(departedDropId, driverA),
        ).rejects.toThrow(ConflictException);
        expect(
          (
            await prisma.deliveryDrop.findUniqueOrThrow({
              where: { id: departedDropId },
            })
          ).deliveredAt,
        ).toEqual(delivered.deliveredAt);

        const after = await prisma.order.findMany({
          where: { id: { in: group } },
          select: { id: true, status: true, billableTotalCents: true },
        });
        expect(
          after.every(({ status }) => status === OrderStatus.DELIVERED),
        ).toBe(true);
        expect(
          after
            .map(({ id, billableTotalCents }) => ({ id, billableTotalCents }))
            .sort((a, b) => a.id.localeCompare(b.id)),
        ).toEqual(before.sort((a, b) => a.id.localeCompare(b.id)));
        for (const id of group)
          expect(await events(id, OrderEventType.DELIVERED)).toBe(1);
      });

      it('derives onTime: null before delivery, exact equality on time, later is late', async () => {
        // No date filter: the test moves scheduledDeliveryAt onto the real delivery instant.
        const onTimeFor = async (id: string) =>
          (await dispatchQuery.list({ page: 1, pageSize: 100 })).data.find(
            (drop) => drop.id === id,
          )!.onTime;
        const [pending] = await prisma.order.findMany({
          where: {
            companyId: fx.companyId,
            deliveryDate: new Date(`${date}T00:00:00.000Z`),
            status: OrderStatus.CONFIRMED,
          },
        });
        expect(await onTimeFor(pending!.deliveryDropId!)).toBeNull();

        const { deliveredAt } = await prisma.deliveryDrop.findUniqueOrThrow({
          where: { id: departedDropId },
        });
        await prisma.deliveryDrop.update({
          where: { id: departedDropId },
          data: { scheduledDeliveryAt: deliveredAt! },
        });
        expect(await onTimeFor(departedDropId)).toBe(true);
        await prisma.deliveryDrop.update({
          where: { id: departedDropId },
          data: { scheduledDeliveryAt: new Date(deliveredAt!.getTime() - 1) },
        });
        expect(await onTimeFor(departedDropId)).toBe(false);
      });

      it('refuses to deliver a Drop whose attached Orders are in an unexpected state', async () => {
        const [orderId] = await readyOrders('2099-07-12', 1);
        const dropId = (await dropOf(orderId!))!;
        await dispatch.assignDriver(dropId, driverA, fx.staffId);
        await dispatch.outForDelivery(dropId, fx.staffId);
        await prisma.order.update({
          where: { id: orderId! },
          data: { status: OrderStatus.CANCELLED },
        });

        await expect(driver.markDelivered(dropId, driverA)).rejects.toThrow(
          /unexpected states/,
        );
        const drop = await prisma.deliveryDrop.findUniqueOrThrow({
          where: { id: dropId },
        });
        expect(drop).toMatchObject({
          status: DeliveryDropStatus.OUT_FOR_DELIVERY,
          deliveredAt: null,
        });
        expect(
          (await prisma.order.findUniqueOrThrow({ where: { id: orderId! } }))
            .status,
        ).toBe(OrderStatus.CANCELLED);
      });
    });

    it("Driver Today is the authenticated Driver's Drops on the current business date (not UTC date)", async () => {
      const snapshot = {
        addressLabelSnapshot: 'TEST',
        addressLine1Snapshot: 'x',
        addressCitySnapshot: 'x',
        addressCountrySnapshot: 'IN',
      };
      const drop = (
        id: string,
        driverStaffUserId: string,
        scheduledDeliveryAt: string,
        status: DeliveryDropStatus = DeliveryDropStatus.DISPATCH_READY,
      ) => ({
        id: testId(`DISPATCH:today-${id}`),
        companyId: fx.companyId,
        driverStaffUserId,
        scheduledDeliveryAt: new Date(scheduledDeliveryAt),
        status,
        ...snapshot,
      });
      await prisma.deliveryDrop.createMany({
        data: [
          drop(
            'early',
            driverA,
            '2099-07-31T19:00:00.000Z',
            DeliveryDropStatus.DELIVERED,
          ), // 00:30 IST Aug 1 → today
          drop(
            'noon',
            driverA,
            '2099-08-01T06:30:00.000Z',
            DeliveryDropStatus.OUT_FOR_DELIVERY,
          ), // 12:00 IST Aug 1 → today
          drop('tomorrow', driverA, '2099-08-01T19:00:00.000Z'), // 00:30 IST Aug 2 (still Aug 1 in UTC) → excluded
          drop('other-driver', driverB, '2099-08-01T07:00:00.000Z'),
        ],
      });
      vi.spyOn(businessTime, 'now').mockReturnValue(
        Temporal.Instant.from('2099-08-01T06:00:00Z'),
      );
      const today = await driverQuery.getTodayDrops(driverA);
      expect(today.businessDate).toBe('2099-08-01');
      expect(today.data.map(({ id }) => id)).toEqual([
        testId('DISPATCH:today-early'),
        testId('DISPATCH:today-noon'),
      ]);
      expect(today.data.map(({ status }) => status)).toEqual([
        DeliveryDropStatus.DELIVERED,
        DeliveryDropStatus.OUT_FOR_DELIVERY,
      ]);
    });
  },
);
