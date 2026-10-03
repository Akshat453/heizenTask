import { vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { DispatchQueryService } from './dispatch-query.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { BusinessTimeService } from '../../business-time/business-time.service.js';
import { DeliveryProofService } from '../../driver/services/delivery-proof.service.js';

describe('DispatchQueryService', () => {
  let service: DispatchQueryService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DispatchQueryService,
        {
          provide: PrismaService,
          useValue: {
            deliveryDrop: { findMany: vi.fn(), findUnique: vi.fn() },
          },
        },
        {
          provide: BusinessTimeService,
          useValue: { getBusinessDateBounds: vi.fn() },
        },
        {
          provide: DeliveryProofService,
          useValue: { generatePresignedUrl: vi.fn() },
        },
      ],
    }).compile();

    service = module.get<DispatchQueryService>(DispatchQueryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
