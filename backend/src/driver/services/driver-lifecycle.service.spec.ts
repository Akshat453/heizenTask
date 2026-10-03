import { vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { DriverLifecycleService } from './driver-lifecycle.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { DeliveryProofService } from './delivery-proof.service.js';

describe('DriverLifecycleService', () => {
  let service: DriverLifecycleService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DriverLifecycleService,
        {
          provide: PrismaService,
          useValue: {
            $transaction: vi.fn(),
            deliveryDrop: { findUnique: vi.fn(), updateMany: vi.fn() },
            orderEvent: { createMany: vi.fn() },
          },
        },
        {
          provide: DeliveryProofService,
          useValue: { uploadPhoto: vi.fn(), deletePhoto: vi.fn() },
        },
      ],
    }).compile();

    service = module.get<DriverLifecycleService>(DriverLifecycleService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
