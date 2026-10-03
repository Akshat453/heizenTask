import { vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { DriverQueryService } from './driver-query.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { BusinessTimeService } from '../../business-time/business-time.service.js';

describe('DriverQueryService', () => {
  let service: DriverQueryService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DriverQueryService,
        {
          provide: PrismaService,
          useValue: {
            deliveryDrop: { findMany: vi.fn() },
          },
        },
        {
          provide: BusinessTimeService,
          useValue: { getBusinessDateBounds: vi.fn(), getTimezone: vi.fn().mockReturnValue('UTC') },
        },
      ],
    }).compile();

    service = module.get<DriverQueryService>(DriverQueryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
