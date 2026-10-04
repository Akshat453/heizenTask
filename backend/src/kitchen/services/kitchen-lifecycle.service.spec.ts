import { vi, describe, beforeEach, it, expect } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { KitchenLifecycleService } from './kitchen-lifecycle.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { OrderEventType, OrderStatus } from '../../generated/prisma/enums.js';
import { DeliveryGroupingService } from '../../dispatch/services/delivery-grouping.service.js';

type Unit = {
  id: string;
  orderId: string;
  startedAt: Date | null;
  doneAt: Date | null;
};

function makeTx(options: {
  status?: OrderStatus;
  unit?: Partial<Unit>;
  unfinished?: number;
  kitchenStartedAt?: Date | null;
}) {
  const unit: Unit = {
    id: 'pu1',
    orderId: 'ord1',
    startedAt: null,
    doneAt: null,
    ...options.unit,
  };
  return {
    $queryRaw: vi
      .fn()
      .mockResolvedValue([{ status: options.status ?? OrderStatus.CONFIRMED }]),
    prepUnit: {
      findUnique: vi.fn().mockResolvedValue({ orderId: unit.orderId }),
      findUniqueOrThrow: vi.fn().mockResolvedValue(unit),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      count: vi.fn().mockResolvedValue(options.unfinished ?? 1),
    },
    order: {
      updateMany: vi
        .fn()
        .mockImplementation(({ where }: { where: Record<string, unknown> }) =>
          Promise.resolve({
            count:
              'kitchenStartedAt' in where
                ? options.kitchenStartedAt
                  ? 0
                  : 1
                : 1,
          }),
        ),
    },
    orderEvent: { create: vi.fn() },
  };
}

describe('KitchenLifecycleService', () => {
  let service: KitchenLifecycleService;
  let tx: ReturnType<typeof makeTx>;
  const prisma = {
    $transaction: vi.fn(async (cb: (client: unknown) => unknown) => cb(tx)),
  };
  const deliveryGrouping = { ensureReadyDropForOrder: vi.fn() };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KitchenLifecycleService,
        { provide: PrismaService, useValue: prisma },
        { provide: DeliveryGroupingService, useValue: deliveryGrouping },
      ],
    }).compile();
    service = module.get(KitchenLifecycleService);
  });

  const eventTypes = () =>
    tx.orderEvent.create.mock.calls.map(
      ([arg]) => (arg as { data: { type: OrderEventType } }).data.type,
    );

  it('starts a NOT_STARTED unit, setting kitchenStartedAt and KITCHEN_STARTED once', async () => {
    tx = makeTx({});
    await expect(service.startPrepUnit('pu1', 'staff1')).resolves.toMatchObject(
      { success: true, kitchenReady: false },
    );
    expect(tx.prepUnit.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ startedByStaffUserId: 'staff1' }),
      }),
    );
    expect(eventTypes()).toEqual([OrderEventType.KITCHEN_STARTED]);

    tx = makeTx({ kitchenStartedAt: new Date() });
    await service.startPrepUnit('pu1', 'staff1');
    expect(eventTypes()).toEqual([]);
  });

  it('rejects Kitchen work for a non-CONFIRMED order and repeated transitions', async () => {
    tx = makeTx({ status: OrderStatus.CANCELLED });
    await expect(service.startPrepUnit('pu1', 'staff1')).rejects.toThrow(
      ConflictException,
    );
    tx = makeTx({ unit: { startedAt: new Date() } });
    await expect(service.startPrepUnit('pu1', 'staff1')).rejects.toThrow(
      /already started/,
    );
    tx = makeTx({ unit: { doneAt: new Date() } });
    await expect(service.completePrepUnit('pu1', 'staff1')).rejects.toThrow(
      /already done/,
    );
  });

  it('completing an unstarted unit writes both start and done actors', async () => {
    tx = makeTx({ unfinished: 1 });
    await service.completePrepUnit('pu1', 'staff1');
    const data = tx.prepUnit.updateMany.mock.calls[0]![0].data;
    expect(data).toMatchObject({
      startedByStaffUserId: 'staff1',
      doneByStaffUserId: 'staff1',
    });
    expect(data.startedAt).toBe(data.doneAt);
  });

  it('completing a started unit preserves startedAt', async () => {
    tx = makeTx({
      unit: { startedAt: new Date('2026-01-01') },
      unfinished: 1,
      kitchenStartedAt: new Date(),
    });
    await service.completePrepUnit('pu1', 'staff1');
    expect(tx.prepUnit.updateMany.mock.calls[0]![0].data).not.toHaveProperty(
      'startedAt',
    );
  });

  it('final completion sets KITCHEN_READY once and reports a structured grouping failure', async () => {
    tx = makeTx({ unfinished: 0, kitchenStartedAt: new Date() });
    deliveryGrouping.ensureReadyDropForOrder.mockRejectedValueOnce(
      new Error('lock timeout'),
    );
    const result = await service.completePrepUnit('pu1', 'staff1');
    expect(eventTypes()).toEqual([OrderEventType.KITCHEN_READY]);
    expect(result).toMatchObject({
      kitchenReady: true,
      dispatch: {
        status: 'FAILED',
        recovery: 'POST /dispatch/drops/reconcile',
      },
    });

    tx = makeTx({ unfinished: 0, kitchenStartedAt: new Date() });
    deliveryGrouping.ensureReadyDropForOrder.mockResolvedValueOnce({
      dropId: 'drop1',
    });
    await expect(
      service.completePrepUnit('pu1', 'staff1'),
    ).resolves.toMatchObject({
      dispatch: { status: 'GROUPED', dropId: 'drop1' },
    });
  });
});
