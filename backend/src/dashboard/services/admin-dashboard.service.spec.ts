import { Test, TestingModule } from '@nestjs/testing';
import { AdminDashboardService } from './admin-dashboard.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { BusinessTimeService } from '../../business-time/business-time.service.js';
import { SettingsService } from '../../settings/settings.service.js';

describe('AdminDashboardService', () => {
  let service: AdminDashboardService;
  let prisma: any;
  let businessTime: any;
  let settingsService: any;

  beforeEach(async () => {
    prisma = {
      order: { count: vi.fn(), aggregate: vi.fn(), findMany: vi.fn() },
      deliveryDrop: { count: vi.fn() },
    };
    businessTime = {
      getTimezone: vi.fn().mockResolvedValue('UTC'),
      getBusinessDate: vi.fn().mockResolvedValue('2025-01-01'),
      getBusinessDateBounds: vi.fn().mockResolvedValue({
        start: new Date('2025-01-01T00:00:00Z'),
        end: new Date('2025-01-02T00:00:00Z'),
      }),
    };
    settingsService = {
      getSettings: vi.fn().mockResolvedValue({
        settings: { kitchenReadyBufferMinutes: 30 },
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminDashboardService,
        { provide: PrismaService, useValue: prisma },
        { provide: BusinessTimeService, useValue: businessTime },
        { provide: SettingsService, useValue: settingsService },
      ],
    }).compile();

    service = module.get<AdminDashboardService>(AdminDashboardService);
  });

  it('should calculate metrics correctly', async () => {
    prisma.order.count.mockResolvedValue(10);
    prisma.order.aggregate.mockResolvedValueOnce({
      _sum: { billableTotalCents: 5000 },
    });
    prisma.order.aggregate.mockResolvedValueOnce({
      _sum: { billableTotalCents: 10000 },
    });
    prisma.deliveryDrop.count.mockResolvedValue(5);

    const now = new Date();
    // Two orders with the same delivery time, but different lead times.
    // Order A has a smaller lead time, so its plannedKitchenReadyAt is later.
    // Order B has a larger lead time, so its plannedKitchenReadyAt is earlier (and might be late now).
    prisma.order.findMany.mockResolvedValue([
      {
        id: 'ordA',
        deliveryAt: new Date(now.getTime() + 120 * 60000), // 2 hours from now
        deliveryLeadMinutesSnapshot: 30, // planned = 120 - 30 - 30 = 60 mins from now. (Not late)
        _count: { prepUnits: 2 },
      },
      {
        id: 'ordB',
        deliveryAt: new Date(now.getTime() + 120 * 60000), // 2 hours from now
        deliveryLeadMinutesSnapshot: 120, // planned = 120 - 120 - 30 = -30 mins from now. (Late)
        _count: { prepUnits: 3 },
      },
    ]);

    const result = await service.getAdminDashboard();

    expect(result.metrics.todayOrders).toBe(10);
    expect(result.metrics.todayBillableCents).toBe(5000);
    expect(result.metrics.uninvoicedCents).toBe(10000);
    expect(result.metrics.activeDeliveries).toBe(5);

    // Only ordB is late.
    expect(result.metrics.lateKitchenOrders).toBe(1);
    expect(result.metrics.latePrepUnits).toBe(3);
  });
});
