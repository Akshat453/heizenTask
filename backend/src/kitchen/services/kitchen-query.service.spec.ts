import { vi, describe, beforeEach, it, expect } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { KitchenQueryService } from './kitchen-query.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { SettingsService } from '../../settings/settings.service.js';
import { OrderStatus } from '../../generated/prisma/enums.js';

describe('KitchenQueryService', () => {
  let service: KitchenQueryService;
  let prisma: any;
  let settingsService: any;

  beforeEach(async () => {
    prisma = {
      prepUnit: { findMany: vi.fn() },
    };

    settingsService = {
      getSettings: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KitchenQueryService,
        { provide: PrismaService, useValue: prisma },
        { provide: SettingsService, useValue: settingsService },
      ],
    }).compile();

    service = module.get<KitchenQueryService>(KitchenQueryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getKitchenBoard', () => {
    const baseSettings = {
      settings: {
        atRiskWindowMinutes: 30,
        kitchenReadyBufferMinutes: 60,
      },
    };

    const baseUnit = {
      id: 'unit1',
      quantity: 1,
      stationId: 'st1',
      stationNameSnapshot: 'Station 1',
      startedAt: null,
      doneAt: null,
      order: {
        id: 'ord1',
        orderNumber: 'ORD-1',
        company: { name: 'Comp A' },
        employee: { name: 'Emp A' },
        deliveryDate: new Date('2025-01-06'),
        deliveryAt: new Date(Date.now() + 1000 * 60 * 120), // 2 hours from now
        deliveryLeadMinutesSnapshot: 60,
        kitchenReadyAt: null,
      },
      combination: {
        orderLine: { dishNameSnapshot: 'Dish A' },
        options: [
          {
            optionGroupNameSnapshot: 'Opt',
            optionNameSnapshot: 'Val',
            portionNameSnapshot: null,
          },
        ],
      },
    };

    it('filters prep units properly and derives statuses', async () => {
      settingsService.getSettings.mockResolvedValue(baseSettings);

      // We will manipulate `now` via vi.useFakeTimers or just simple time math
      const now = new Date();
      // plannedKitchenReadyAt will be 60 mins before deliveryAt.
      // deliveryAt = now + 120m
      // plannedKitchenReadyAt = now + 60m.
      // atRiskWindow = 30m.
      // Since now is 60m before deadline, it should be ON_TRACK.

      prisma.prepUnit.findMany.mockResolvedValue([
        {
          ...baseUnit,
          order: {
            ...baseUnit.order,
            deliveryAt: new Date(now.getTime() + 1000 * 60 * 160),
          },
        },
      ]);

      const items = await service.getKitchenBoard('2025-01-06');
      expect(prisma.prepUnit.findMany).toHaveBeenCalledWith({
        where: {
          order: {
            deliveryDate: expect.any(Date),
            status: OrderStatus.CONFIRMED,
          },
        },
        include: expect.anything(),
      });

      expect(items.length).toBe(1);
      expect(items[0].prepState).toBe('NOT_STARTED');
      expect(items[0].timingState).toBe('ON_TRACK');
    });

    it('identifies AT_RISK and LATE timing states', async () => {
      settingsService.getSettings.mockResolvedValue(baseSettings);
      const now = new Date();

      const atRiskDelivery = new Date(now.getTime() + 1000 * 60 * 135); // planned = now + 15m. (within 30m risk window)
      const lateDelivery = new Date(now.getTime() + 1000 * 60 * 30); // planned = now - 90m. (late)

      prisma.prepUnit.findMany.mockResolvedValue([
        {
          ...baseUnit,
          id: 'unit-at-risk',
          order: { ...baseUnit.order, deliveryAt: atRiskDelivery },
        },
        {
          ...baseUnit,
          id: 'unit-late',
          order: { ...baseUnit.order, deliveryAt: lateDelivery },
        },
      ]);

      const items = await service.getKitchenBoard('2025-01-06');
      const atRisk = items.find((i) => i.id === 'unit-at-risk');
      const late = items.find((i) => i.id === 'unit-late');

      expect(atRisk?.timingState).toBe('AT_RISK');
      expect(late?.timingState).toBe('LATE');
    });

    it('identifies STARTED and DONE prep states', async () => {
      settingsService.getSettings.mockResolvedValue(baseSettings);

      prisma.prepUnit.findMany.mockResolvedValue([
        { ...baseUnit, id: 'u1', startedAt: new Date() },
        { ...baseUnit, id: 'u2', startedAt: new Date(), doneAt: new Date() },
      ]);

      const items = await service.getKitchenBoard('2025-01-06');
      const u1 = items.find((i) => i.id === 'u1');
      const u2 = items.find((i) => i.id === 'u2');

      expect(u1?.prepState).toBe('STARTED');
      expect(u2?.prepState).toBe('DONE');
      expect(u2?.timingState).toBe('COMPLETE'); // If doneAt is set, timingState must be COMPLETE
    });
  });
});
