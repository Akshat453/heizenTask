import { ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Temporal } from '@js-temporal/polyfill';
import pg from 'pg';
import { AppModule } from '../src/app.module.js';
import { BusinessTimeService } from '../src/business-time/business-time.service.js';
import { MenuPreviewService } from '../src/employees/menu-preview.service.js';
import { OrderEventType, OrderStatus } from '../src/generated/prisma/enums.js';
import type {
  CreateOrderDto,
  OrderLineDto,
} from '../src/orders/dto/order.dto.js';
import { CutoffService } from '../src/orders/services/cutoff.service.js';
import { OrderCreationService } from '../src/orders/services/order-creation.service.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { cleanupTestData } from './support/fixtures.js';
import {
  createOrderingFixture,
  ensurePlatformSettings,
  type OrderingFixture,
} from './support/ordering-fixture.js';

const BEFORE_CUTOFF = Temporal.Instant.from('2026-01-01T00:00:00Z');
const AFTER_CUTOFF = Temporal.Instant.from('2100-01-01T00:00:00Z');

describe('Order create / edit / place (PostgreSQL)', () => {
  let moduleRef: TestingModule;
  let prisma: PrismaService;
  let orders: OrderCreationService;
  let cutoff: CutoffService;
  let businessTime: BusinessTimeService;
  let fx: OrderingFixture;
  let restoreSettings: () => Promise<void>;

  const bowlLine = (
    paneerQty: number,
    tofuQty: number,
    large = false,
  ): OrderLineDto => ({
    dishId: fx.bowlId,
    quantity: paneerQty + tofuQty,
    combinations: [
      ...(paneerQty
        ? [
            {
              quantity: paneerQty,
              options: [
                { optionGroupId: fx.proteinGroupId, optionId: fx.paneerId },
                {
                  optionGroupId: fx.riceGroupId,
                  optionId: fx.riceId,
                  portionSizeId: large ? fx.largeId : fx.smallId,
                },
              ],
            },
          ]
        : []),
      ...(tofuQty
        ? [
            {
              quantity: tofuQty,
              options: [
                { optionGroupId: fx.proteinGroupId, optionId: fx.tofuId },
              ],
            },
          ]
        : []),
    ],
  });
  const createDto = (
    deliveryDate: string,
    overrides: Partial<CreateOrderDto> = {},
  ): CreateOrderDto => ({
    employeeId: fx.employeeId,
    deliveryDate,
    placeOrder: false,
    lines: [bowlLine(2, 1)],
    ...overrides,
  });
  const loadGraph = (orderId: string) =>
    prisma.order.findUniqueOrThrow({
      where: { id: orderId },
      include: {
        lines: { include: { combinations: { include: { options: true } } } },
        events: true,
        prepUnits: true,
      },
    });

  /** Independent connection holding the Order row lock, plus a probe for queued lock waiters. */
  async function rowLockHolder(orderId: string) {
    const client = new pg.Client({
      connectionString: process.env.TEST_DATABASE_URL,
    });
    await client.connect();
    await client.query('BEGIN');
    await client.query('SELECT id FROM "Order" WHERE id = $1 FOR UPDATE', [
      orderId,
    ]);
    // pg_stat_activity is snapshotted per transaction, so poll from a separate autocommit connection.
    const probe = new pg.Client({
      connectionString: process.env.TEST_DATABASE_URL,
    });
    await probe.connect();
    let released = false;
    return {
      async waitForWaiters(
        count: number,
        pending: Array<{ label: string; promise: Promise<unknown> }>,
      ) {
        const states = pending.map(({ label, promise }) => {
          const state = { label, settled: 'pending' as string };
          promise.then(
            () => (state.settled = 'resolved'),
            (error: unknown) =>
              (state.settled = `rejected: ${error instanceof Error ? error.message : String(error)}`),
          );
          return state;
        });
        const deadline = Date.now() + 20_000;
        while (Date.now() < deadline) {
          const { rows } = await probe.query(
            `SELECT count(*)::int AS n FROM pg_stat_activity WHERE datname = current_database() AND state = 'active' AND wait_event_type = 'Lock'`,
          );
          if (rows[0].n >= count) return;
          if (states.some(({ settled }) => settled !== 'pending')) break;
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
        const { rows } = await probe.query(
          `SELECT state, wait_event_type, wait_event, left(query, 80) AS query FROM pg_stat_activity WHERE datname = current_database() AND pid <> pg_backend_pid()`,
        );
        throw new Error(
          `Expected ${count} lock waiter(s). Promises: ${JSON.stringify(states)}. Activity: ${JSON.stringify(rows)}`,
        );
      },
      async release() {
        if (released) return;
        released = true;
        await client.query('COMMIT');
        await client.end();
        await probe.end();
      },
    };
  }

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    prisma = moduleRef.get(PrismaService);
    orders = moduleRef.get(OrderCreationService);
    cutoff = moduleRef.get(CutoffService);
    businessTime = moduleRef.get(BusinessTimeService);
    await cleanupTestData(prisma);
    restoreSettings = await ensurePlatformSettings(prisma);
    fx = await createOrderingFixture(prisma, 'ORDERS');
  });

  afterEach(() => vi.restoreAllMocks());

  afterAll(async () => {
    try {
      await cleanupTestData(prisma);
    } finally {
      await restoreSettings();
      await moduleRef.close();
    }
  });

  it('creates a DRAFT with business-time deliveryAt, defaults, snapshots and null billable total', async () => {
    const order = await orders.create(createDto('2099-03-02'), fx.staffId);
    const graph = await loadGraph(order.id);
    expect(graph.status).toBe(OrderStatus.DRAFT);
    expect(graph.deliveryAt.toISOString()).toBe('2099-03-02T07:00:00.000Z'); // 12:30 Asia/Kolkata
    expect(graph).toMatchObject({
      deliveryAddressId: fx.homeAddressId,
      packagingTypeId: fx.boxId,
      deliveryLeadMinutesSnapshot: 45,
      billableTotalCents: null,
    });
    // 2 × (300 + 80 paneer + 25 rice) + 1 × (300 + 60 tofu) = 810 + 360
    expect(graph.totalCents).toBe(1170);
    expect(graph.lines[0]!.combinations).toHaveLength(2);
    expect(graph.events.map(({ type }) => type)).toEqual([
      OrderEventType.ORDER_CREATED,
    ]);
  });

  it('edits a DRAFT with a populated combination graph (FK-safe replacement, no fake events)', async () => {
    const order = await orders.create(createDto('2099-03-03'), fx.staffId);
    const before = await loadGraph(order.id);
    await orders.update(
      order.id,
      { lines: [bowlLine(3, 0, true)] },
      fx.staffId,
    );
    const after = await loadGraph(order.id);

    expect(after.status).toBe(OrderStatus.DRAFT);
    expect(after.totalCents).toBe(3 * (300 + 80 + 25 + 40));
    expect(after.lines).toHaveLength(1);
    expect(after.lines[0]!.quantity).toBe(3);
    expect(
      after.lines[0]!.combinations.map(({ quantity }) => quantity),
    ).toEqual([3]);
    expect(
      after.lines[0]!.combinations[0]!.options.find(
        ({ portionSizeId }) => portionSizeId,
      )?.portionNameSnapshot,
    ).toBe('TEST-ORDERS-LARGE');
    const oldCombinationIds = before.lines.flatMap(({ combinations }) =>
      combinations.map(({ id }) => id),
    );
    expect(
      await prisma.orderCombination.count({
        where: { id: { in: oldCombinationIds } },
      }),
    ).toBe(0);
    expect(after.events.map(({ type }) => type)).toEqual([
      OrderEventType.ORDER_CREATED,
    ]);
    expect(after.billableTotalCents).toBeNull();
  });

  it('places a DRAFT once, refreshing prices; a PLACED edit stays PLACED', async () => {
    const order = await orders.create(createDto('2099-03-04'), fx.staffId);
    await prisma.dishTierPrice.update({
      where: {
        dishId_priceTierId: { dishId: fx.bowlId, priceTierId: fx.tierId },
      },
      data: { priceCents: 350 },
    });
    try {
      await orders.place(order.id, fx.staffId);
      let graph = await loadGraph(order.id);
      expect(graph.status).toBe(OrderStatus.PLACED);
      expect(graph.placedAt).not.toBeNull();
      expect(graph.totalCents).toBe(2 * (350 + 80 + 25) + (350 + 60));
      expect(graph.lines[0]!.dishUnitPriceCents).toBe(350);

      await expect(orders.place(order.id, fx.staffId)).rejects.toThrow(
        ConflictException,
      );
      await orders.update(
        order.id,
        { placeOrder: false, lines: [bowlLine(1, 1)] },
        fx.staffId,
      );
      graph = await loadGraph(order.id);
      expect(graph.status).toBe(OrderStatus.PLACED);
      expect(
        graph.events.filter(({ type }) => type === OrderEventType.ORDER_PLACED),
      ).toHaveLength(1);
      expect(graph.billableTotalCents).toBeNull();
    } finally {
      await prisma.dishTierPrice.update({
        where: {
          dishId_priceTierId: { dishId: fx.bowlId, priceTierId: fx.tierId },
        },
        data: { priceCents: 300 },
      });
    }
  });

  it('preserves an existing (admin-overridden) delivery selection when an edit omits it', async () => {
    const order = await orders.create(createDto('2099-03-05'), fx.staffId);
    await prisma.order.update({
      where: { id: order.id },
      data: {
        packagingTypeId: fx.trayId,
        packagingNameSnapshot: 'TEST-ORDERS-TRAY',
        deliveryAt: new Date('2099-03-05T09:00:00.000Z'),
      },
    });
    await orders.update(order.id, { lines: [bowlLine(1, 1)] }, fx.staffId);
    const graph = await loadGraph(order.id);
    expect(graph.packagingTypeId).toBe(fx.trayId);
    expect(graph.deliveryAt.toISOString()).toBe('2099-03-05T09:00:00.000Z');
    // An explicit non-default change still requires the Employee flag.
    await expect(
      orders.update(
        order.id,
        { deliveryAddressId: fx.annexAddressId },
        fx.staffId,
      ),
    ).rejects.toThrow(/non-default delivery address/);
  });

  it('keeps Menu Preview and Order validation in parity', async () => {
    const preview = await moduleRef
      .get(MenuPreviewService)
      .preview(fx.employeeId);
    const previewDishIds = preview.categories.flatMap(({ dishes }) =>
      dishes.map(({ id }) => id),
    );
    expect(previewDishIds).toContain(fx.bowlId);
    expect(previewDishIds).not.toContain(fx.hiddenDishId);
    await expect(
      orders.create(
        createDto('2099-03-06', {
          lines: [
            {
              dishId: fx.hiddenDishId,
              quantity: 1,
              combinations: [{ quantity: 1, options: [] }],
            },
          ],
        }),
        fx.staffId,
      ),
    ).rejects.toThrow(/not orderable/);
  });

  it('edit vs cutoff — edit wins the row lock: cutoff confirms the new graph and total', async () => {
    const deliveryDate = '2099-04-01';
    const order = await orders.create(
      createDto(deliveryDate, { placeOrder: true }),
      fx.staffId,
    );
    const now = vi.spyOn(businessTime, 'now').mockReturnValue(BEFORE_CUTOFF);
    const holder = await rowLockHolder(order.id);
    let edit: Promise<unknown> | undefined;
    let run: Promise<{ processedCount: number }> | undefined;
    try {
      edit = orders.update(order.id, { lines: [bowlLine(4, 0)] }, fx.staffId);
      await holder.waitForWaiters(1, [{ label: 'edit', promise: edit }]);
      now.mockReturnValue(AFTER_CUTOFF);
      run = cutoff.processManual({ deliveryDate }, fx.staffId);
      await holder.waitForWaiters(2, [
        { label: 'edit', promise: edit },
        { label: 'cutoff', promise: run },
      ]);
      now.mockReturnValueOnce(BEFORE_CUTOFF); // the edit, first in the lock queue, evaluates cutoff before it passes
    } finally {
      await holder.release();
    }

    await expect(edit).resolves.toBeDefined();
    expect((await run!).processedCount).toBe(1);
    const graph = await loadGraph(order.id);
    const combinationIds = graph.lines.flatMap(({ combinations }) =>
      combinations.map(({ id }) => id),
    );
    expect(graph.status).toBe(OrderStatus.CONFIRMED);
    expect(graph.totalCents).toBe(4 * (300 + 80 + 25));
    expect(graph.billableTotalCents).toBe(graph.totalCents);
    expect(
      graph.prepUnits.map(({ combinationId }) => combinationId).sort(),
    ).toEqual(combinationIds.sort());
  });

  it('edit vs cutoff — cutoff wins the row lock: the edit sees CONFIRMED and gets 409', async () => {
    const deliveryDate = '2099-04-02';
    const order = await orders.create(
      createDto(deliveryDate, { placeOrder: true }),
      fx.staffId,
    );
    const original = await loadGraph(order.id);
    vi.spyOn(businessTime, 'now').mockReturnValue(AFTER_CUTOFF);
    const holder = await rowLockHolder(order.id);
    let edit: Promise<unknown> | undefined;
    let run: Promise<{ processedCount: number }> | undefined;
    try {
      run = cutoff.processManual({ deliveryDate }, fx.staffId);
      await holder.waitForWaiters(1, [{ label: 'cutoff', promise: run }]);
      edit = orders.update(order.id, { lines: [bowlLine(4, 0)] }, fx.staffId);
      await holder.waitForWaiters(2, [
        { label: 'cutoff', promise: run },
        { label: 'edit', promise: edit },
      ]);
    } finally {
      await holder.release();
    }

    expect((await run!).processedCount).toBe(1);
    await expect(edit).rejects.toThrow(ConflictException);
    const graph = await loadGraph(order.id);
    expect(graph.status).toBe(OrderStatus.CONFIRMED);
    expect(graph.totalCents).toBe(original.totalCents);
    expect(graph.billableTotalCents).toBe(original.totalCents);
    const originalCombinationIds = original.lines
      .flatMap(({ combinations }) => combinations.map(({ id }) => id))
      .sort();
    expect(
      graph.lines
        .flatMap(({ combinations }) => combinations.map(({ id }) => id))
        .sort(),
    ).toEqual(originalCombinationIds);
    expect(
      graph.prepUnits.map(({ combinationId }) => combinationId).sort(),
    ).toEqual(originalCombinationIds);
  });
});
