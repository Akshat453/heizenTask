import { vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { DispatchLifecycleService } from './dispatch-lifecycle.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';

describe('DispatchLifecycleService', () => {
  let service: DispatchLifecycleService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DispatchLifecycleService,
        {
          provide: PrismaService,
          useValue: {
            $transaction: vi.fn(),
            deliveryDrop: { findUnique: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
            staffUser: { findUnique: vi.fn() },
          },
        },
      ],
    }).compile();

    service = module.get<DispatchLifecycleService>(DispatchLifecycleService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
