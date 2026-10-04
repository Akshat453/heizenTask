import { vi, describe, beforeEach, it, expect } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { CutoffService, UNASSIGNED_STATION_NAME } from './cutoff.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { BusinessTimeService } from '../../business-time/business-time.service.js';
import { SettingsService } from '../../settings/settings.service.js';
import { OrderStatus } from '../../generated/prisma/enums.js';

describe('CutoffService', () => {
  let service: CutoffService;
  let prisma: any;
  let tx: any;
  let businessTime: { computeCutoff: ReturnType<typeof vi.fn> };
  const setOpen = (open: boolean) =>
    businessTime.computeCutoff.mockReturnValue({ passed: !open });

  beforeEach(async () => {
    tx = {
      $queryRaw: vi.fn().mockResolvedValue([{ id: 'ord1' }]),
      order: {
        findUnique: vi.fn(),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      orderLine: {
        findMany: vi.fn().mockResolvedValue([
          {
            dish: { stationId: null, station: null },
            combinations: [
              { id: 'c1', quantity: 2 },
              { id: 'c2', quantity: 1 },
            ],
          },
        ]),
      },
      prepUnit: { createMany: vi.fn() },
      orderEvent: { create: vi.fn() },
    };
    prisma = {
      order: {
        findMany: vi
          .fn()
          .mockResolvedValue([
            { id: 'ord1', deliveryDate: new Date('2025-01-06T00:00:00.000Z') },
          ]),
      },
      $transaction: vi.fn(async (cb: (client: unknown) => unknown) => cb(tx)),
    };
    businessTime = { computeCutoff: vi.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CutoffService,
        { provide: PrismaService, useValue: prisma },
        { provide: BusinessTimeService, useValue: businessTime },
        {
          provide: SettingsService,
          useValue: { loadForBusinessTime: vi.fn().mockResolvedValue({}) },
        },
      ],
    }).compile();
    service = module.get(CutoffService);
  });

  it('ignores orders whose delivery cutoff has not passed', async () => {
    setOpen(true);
    expect(await service.processManual({}, 'staff1')).toEqual({
      processedCount: 0,
      cancelledCount: 0,
      confirmedCount: 0,
      skippedCount: 1,
      failures: [],
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('cancels DRAFT orders under the row lock', async () => {
    setOpen(false);
    tx.order.findUnique.mockResolvedValue({
      status: OrderStatus.DRAFT,
      deliveryDate: new Date('2025-01-06T00:00:00.000Z'),
      totalCents: 1000,
    });
    expect((await service.processManual({}, 'staff1')).processedCount).toBe(1);
    expect(tx.$queryRaw).toHaveBeenCalled();
    expect(tx.order.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: OrderStatus.CANCELLED }),
      }),
    );
    expect(tx.prepUnit.createMany).not.toHaveBeenCalled();
  });

  it('confirms PLACED orders with the locked total and one PrepUnit per combination', async () => {
    setOpen(false);
    tx.order.findUnique.mockResolvedValue({
      status: OrderStatus.PLACED,
      deliveryDate: new Date('2025-01-06T00:00:00.000Z'),
      totalCents: 1234,
    });
    expect((await service.processManual({}, 'staff1')).processedCount).toBe(1);
    expect(tx.order.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'ord1', status: OrderStatus.PLACED },
        data: expect.objectContaining({ billableTotalCents: 1234 }),
      }),
    );
    expect(tx.prepUnit.createMany.mock.calls[0][0].data).toEqual([
      {
        orderId: 'ord1',
        combinationId: 'c1',
        stationId: null,
        stationNameSnapshot: UNASSIGNED_STATION_NAME,
        quantity: 2,
      },
      {
        orderId: 'ord1',
        combinationId: 'c2',
        stationId: null,
        stationNameSnapshot: UNASSIGNED_STATION_NAME,
        quantity: 1,
      },
    ]);
  });

  it('skips an order that is no longer editable once locked', async () => {
    setOpen(false);
    tx.order.findUnique.mockResolvedValue({
      status: OrderStatus.CONFIRMED,
      deliveryDate: new Date('2025-01-06T00:00:00.000Z'),
      totalCents: 1,
    });
    expect((await service.processManual({}, 'staff1')).processedCount).toBe(0);
    expect(tx.order.updateMany).not.toHaveBeenCalled();
  });

  it('reports per-order failures instead of swallowing them', async () => {
    setOpen(false);
    tx.order.findUnique.mockRejectedValue(
      new Error('connection reset by peer'),
    );
    const summary = await service.processManual({}, 'staff1');
    expect(summary).toMatchObject({
      processedCount: 0,
      failures: [
        {
          orderId: 'ord1',
          message: expect.stringContaining('Unexpected error'),
        },
      ],
    });
    expect(summary.failures[0]!.message).not.toContain('connection reset');
  });
});
