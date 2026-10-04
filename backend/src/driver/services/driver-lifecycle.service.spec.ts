import {
  ConflictException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DeliveryDropStatus,
  OrderStatus,
} from '../../generated/prisma/enums.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { DriverLifecycleService } from './driver-lifecycle.service.js';
import { DeliveryProofService } from './delivery-proof.service.js';

const JPEG = {
  buffer: Buffer.from([0xff, 0xd8, 0xff, 0xe0]),
  size: 4,
  mimetype: 'image/jpeg',
  originalname: 'p.jpg',
};
const outForDelivery = {
  driverStaffUserId: 'driver-a',
  status: DeliveryDropStatus.OUT_FOR_DELIVERY,
  deliveredAt: null,
  scheduledDeliveryAt: new Date(),
};

describe('DriverLifecycleService.markDelivered (upload ordering and cleanup)', () => {
  let service: DriverLifecycleService;
  let tx: Record<string, unknown>;
  const prisma = {
    deliveryDrop: { findUnique: vi.fn() },
    $transaction: vi.fn(async (cb: (client: unknown) => unknown) => cb(tx)),
  };
  const proof = { uploadPhoto: vi.fn(), deletePhoto: vi.fn() };

  beforeEach(async () => {
    vi.clearAllMocks();
    prisma.deliveryDrop.findUnique.mockResolvedValue(outForDelivery);
    tx = {
      $queryRaw: vi
        .fn()
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ id: 'o1', status: OrderStatus.CONFIRMED }]),
      deliveryDrop: {
        findUniqueOrThrow: vi
          .fn()
          .mockResolvedValue({ ...outForDelivery, deliveredAt: new Date() }),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      order: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
      orderEvent: { createMany: vi.fn() },
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DriverLifecycleService,
        { provide: PrismaService, useValue: prisma },
        { provide: DeliveryProofService, useValue: proof },
      ],
    }).compile();
    service = module.get(DriverLifecycleService);
  });

  it('delivers without a photo and without touching storage', async () => {
    await expect(
      service.markDelivered('drop', 'driver-a', 'At reception'),
    ).resolves.toMatchObject({ onTime: expect.any(Boolean) });
    expect(proof.uploadPhoto).not.toHaveBeenCalled();
  });

  it('rejects another driver before any upload', async () => {
    await expect(
      service.markDelivered('drop', 'driver-b', undefined, JPEG),
    ).rejects.toThrow(NotFoundException);
    expect(proof.uploadPhoto).not.toHaveBeenCalled();
  });

  it('leaves delivery unchanged when the upload fails', async () => {
    proof.uploadPhoto.mockRejectedValue(
      new ServiceUnavailableException('Photo upload failed'),
    );
    await expect(
      service.markDelivered('drop', 'driver-a', undefined, JPEG),
    ).rejects.toThrow(ServiceUnavailableException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('uploads first, then deletes the object best-effort when the DB transition loses a race', async () => {
    proof.uploadPhoto.mockResolvedValue('delivery-proofs/drop/abc.jpg');
    (
      tx.deliveryDrop as { updateMany: ReturnType<typeof vi.fn> }
    ).updateMany.mockResolvedValue({ count: 0 });
    await expect(
      service.markDelivered('drop', 'driver-a', undefined, JPEG),
    ).rejects.toThrow(ConflictException);
    expect(proof.uploadPhoto.mock.invocationCallOrder[0]).toBeLessThan(
      prisma.$transaction.mock.invocationCallOrder[0]!,
    );
    expect(proof.deletePhoto).toHaveBeenCalledWith(
      'delivery-proofs/drop/abc.jpg',
    );
  });

  it('persists only the private object key', async () => {
    proof.uploadPhoto.mockResolvedValue('delivery-proofs/drop/abc.jpg');
    await service.markDelivered('drop', 'driver-a', undefined, JPEG);
    const data = (tx.deliveryDrop as { updateMany: ReturnType<typeof vi.fn> })
      .updateMany.mock.calls[0]![0].data;
    expect(data.photoUrl).toBe('delivery-proofs/drop/abc.jpg');
    expect(proof.deletePhoto).not.toHaveBeenCalled();
  });

  it('bounds the delivery note', async () => {
    await expect(
      service.markDelivered('drop', 'driver-a', 'x'.repeat(1001)),
    ).rejects.toThrow(/at most 1000/);
  });
});
