import { Test, TestingModule } from '@nestjs/testing';
import { KitchenDashboardService } from './kitchen-dashboard.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { BusinessTimeService } from '../../business-time/business-time.service.js';
import { SettingsService } from '../../settings/settings.service.js';

describe('KitchenDashboardService', () => {
  let service: KitchenDashboardService;
  let prisma: any;
  let businessTime: any;
  let settingsService: any;

  beforeEach(async () => {
    prisma = {
      prepUnit: { findMany: vi.fn() },
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
        settings: { kitchenReadyBufferMinutes: 30, atRiskWindowMinutes: 30 },
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KitchenDashboardService,
        { provide: PrismaService, useValue: prisma },
        { provide: BusinessTimeService, useValue: businessTime },
        { provide: SettingsService, useValue: settingsService },
      ],
    }).compile();

    service = module.get<KitchenDashboardService>(KitchenDashboardService);
  });

  it('should calculate states properly using deliveryLeadMinutesSnapshot', async () => {
    const now = new Date();
    
    // Test orders with identical deliveryAt but different lead times.
    // Buffer = 30m, atRiskWindow = 30m.
    // Order 1: deliveryAt = now + 90m. lead = 30m. planned = 90 - 30 - 30 = 30m from now.
    // So now < planned (by 30m), but now is NOT >= planned - 30m (which is now). 
    // Wait, planned = now + 30m. planned - 30m = now. So now >= now. This IS At Risk!
    // Let's use 120m for Order 1 to make it ON_TRACK (not at risk).
    // Order 1: deliveryAt = now + 120m. lead = 30. planned = now + 60m. 
    // now < now + 60 (true). now >= now + 30 (false). So ON_TRACK (not started).

    // Order 2: deliveryAt = now + 120m. lead = 90. planned = now. 
    // now >= planned (true). So LATE.

    // Order 3: deliveryAt = now + 120m. lead = 60. planned = now + 30m.
    // now < planned (true). now >= planned - 30m (true). So AT_RISK.

    prisma.prepUnit.findMany.mockResolvedValue([
      {
        id: 'u1',
        startedAt: null, doneAt: null,
        order: {
          id: 'o1', orderNumber: 'O-1', company: { name: 'C1' },
          deliveryAt: new Date(now.getTime() + 120 * 60000),
          deliveryLeadMinutesSnapshot: 30, // Not at risk
        }
      },
      {
        id: 'u2',
        startedAt: null, doneAt: null,
        order: {
          id: 'o2', orderNumber: 'O-2', company: { name: 'C2' },
          deliveryAt: new Date(now.getTime() + 120 * 60000),
          deliveryLeadMinutesSnapshot: 90, // Late
        }
      },
      {
        id: 'u3',
        startedAt: new Date(), doneAt: null,
        order: {
          id: 'o3', orderNumber: 'O-3', company: { name: 'C3' },
          deliveryAt: new Date(now.getTime() + 120 * 60000),
          deliveryLeadMinutesSnapshot: 60, // At risk, and started
        }
      },
    ]);

    const result = await service.getKitchenDashboard();
    
    // notStarted = u1, u2
    expect(result.metrics.notStarted).toBe(2);
    // started = u3
    expect(result.metrics.started).toBe(1);
    
    // late = u2
    expect(result.metrics.late).toBe(1);
    // atRisk = u3
    expect(result.metrics.atRisk).toBe(1);

    // Next deadline should be u2 (planned = now)
    expect(result.metrics.nextDeadline).not.toBeNull();
    expect(result.metrics.nextDeadline!.orderId).toBe('o2');
  });
});
