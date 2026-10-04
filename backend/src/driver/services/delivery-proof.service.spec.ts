import {
  BadRequestException,
  ConflictException,
  GoneException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DeliveryDropStatus,
  OrderStatus,
} from '../../generated/prisma/enums.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { MAX_DELIVERY_PHOTO_BYTES } from '../delivery-photo.js';
import { CLOUDINARY_SDK, type CloudinarySdk } from './cloudinary-sdk.js';
import {
  DeliveryProofService,
  NOT_CONFIGURED_MESSAGE,
  PROOF_URL_TTL_SECONDS,
  type UploadedPhoto,
} from './delivery-proof.service.js';
import { DriverLifecycleService } from './driver-lifecycle.service.js';

const DROP = '11111111-1111-4111-8111-111111111111';
const file = (
  bytes: number[] | Buffer,
  name = 'photo.bin',
  mimetype = 'image/jpeg',
): UploadedPhoto => {
  const buffer = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);
  return { buffer, size: buffer.length, originalname: name, mimetype };
};
const JPEG = file([0xff, 0xd8, 0xff, 0xe0, 0x00]);
const PNG = file([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
const WEBP = file(
  Buffer.concat([
    Buffer.from('RIFF'),
    Buffer.from([0, 0, 0, 0]),
    Buffer.from('WEBPVP8 '),
  ]),
);

/** A fake of the SDK boundary: upload_stream echoes back what Cloudinary would. */
function fakeSdk(
  overrides: { type?: string; format?: string; fail?: boolean } = {},
) {
  const upload_stream = vi.fn(
    (
      options: { public_id: string },
      callback: (error?: unknown, result?: unknown) => void,
    ) => ({
      end: () =>
        overrides.fail
          ? callback({ http_code: 500, message: 'Cloudinary is down' })
          : callback(undefined, {
              public_id: options.public_id,
              format: overrides.format ?? 'jpg',
              type: overrides.type ?? 'authenticated',
              secure_url:
                'https://res.cloudinary.com/demo/image/authenticated/s--sig--/x.jpg',
            }),
    }),
  );
  const destroy = vi.fn().mockResolvedValue({ result: 'ok' });
  const private_download_url = vi.fn(
    () => 'https://api.cloudinary.com/v1_1/demo/image/download?signed',
  );
  const sdk = {
    uploader: { upload_stream, destroy },
    utils: { private_download_url },
  };
  return {
    sdk: sdk as unknown as CloudinarySdk,
    upload_stream,
    destroy,
    private_download_url,
  };
}

describe('DeliveryProofService (Cloudinary, SDK mocked)', () => {
  afterEach(() => vi.useRealTimers());

  it.each([
    ['JPEG', JPEG, 'jpg'],
    ['PNG', PNG, 'png'],
    ['WebP', WEBP, 'webp'],
  ])(
    'accepts %s and stores `public_id.format`, never a URL',
    async (_name, photo, format) => {
      const fake = fakeSdk({ format });
      const locator = await new DeliveryProofService(fake.sdk).uploadPhoto(
        DROP,
        photo,
      );
      expect(locator).toMatch(
        new RegExp(`^delivery-proofs/${DROP}/[0-9a-f-]{36}\\.${format}$`),
      );
      expect(locator).not.toMatch(/^https?:/);
    },
  );

  it('uploads as an authenticated image with a server public_id and no client input', async () => {
    const fake = fakeSdk();
    await new DeliveryProofService(fake.sdk).uploadPhoto(
      DROP,
      file([0xff, 0xd8, 0xff, 0x01], '../../evil.png', 'image/png'),
    );
    const [options] = fake.upload_stream.mock.calls[0]!;
    expect(options).toEqual({
      resource_type: 'image',
      type: 'authenticated',
      public_id: expect.stringMatching(
        new RegExp(`^delivery-proofs/${DROP}/[0-9a-f-]{36}$`),
      ),
      overwrite: false,
    });
    expect(options.public_id).not.toMatch(/\.|evil/); // no extension, no filename
  });

  it.each([
    [
      'SVG',
      file(
        Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>'),
        'a.svg',
        'image/svg+xml',
      ),
    ],
    [
      'HTML',
      file(
        Buffer.from('<!doctype html><script>alert(1)</script>'),
        'a.html',
        'text/html',
      ),
    ],
    [
      'MIME-spoofed text',
      file(Buffer.from('just text'), 'photo.jpg', 'image/jpeg'),
    ],
    [
      'renamed executable',
      file([0x4d, 0x5a, 0x90, 0x00], 'photo.png', 'image/png'),
    ],
    [
      'over 5 MB',
      file(
        Buffer.concat([
          Buffer.from([0xff, 0xd8, 0xff]),
          Buffer.alloc(MAX_DELIVERY_PHOTO_BYTES),
        ]),
      ),
    ],
  ])('rejects %s with 400 and never calls Cloudinary', async (_name, photo) => {
    const fake = fakeSdk();
    await expect(
      new DeliveryProofService(fake.sdk).uploadPhoto(DROP, photo),
    ).rejects.toThrow(BadRequestException);
    expect(fake.upload_stream).not.toHaveBeenCalled();
  });

  it('maps a provider failure to 503 without leaking provider details', async () => {
    const fake = fakeSdk({ fail: true });
    const error = await new DeliveryProofService(fake.sdk)
      .uploadPhoto(DROP, JPEG)
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ServiceUnavailableException);
    expect((error as Error).message).not.toMatch(/Cloudinary is down/);
  });

  it('refuses (and removes) an upload that did not come back authenticated', async () => {
    const fake = fakeSdk({ type: 'upload' });
    await expect(
      new DeliveryProofService(fake.sdk).uploadPhoto(DROP, JPEG),
    ).rejects.toThrow(ServiceUnavailableException);
    expect(fake.destroy).toHaveBeenCalledTimes(1);
  });

  it('generates a short-lived inline URL on demand for the stored locator', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-04T10:00:00Z'));
    const fake = fakeSdk();
    const locator = `delivery-proofs/${DROP}/22222222-2222-4222-8222-222222222222.jpg`;
    const url = new DeliveryProofService(fake.sdk).signedUrl(locator, DROP);
    expect(url).toContain('signed');
    expect(fake.private_download_url).toHaveBeenCalledWith(
      `delivery-proofs/${DROP}/22222222-2222-4222-8222-222222222222`,
      'jpg',
      {
        resource_type: 'image',
        type: 'authenticated',
        expires_at:
          Math.floor(Date.parse('2026-10-04T10:00:00Z') / 1000) +
          PROOF_URL_TTL_SECONDS,
        attachment: false,
      },
    );
  });

  it.each([
    ['a legacy or foreign key', 'proofs/abc.jpg'],
    ['a URL', 'https://example.com/x.jpg'],
    [
      'a locator for another drop',
      'delivery-proofs/33333333-3333-4333-8333-333333333333/22222222-2222-4222-8222-222222222222.jpg',
    ],
  ])('reports %s as 410 "Photo unavailable", not 500', (_name, locator) => {
    const fake = fakeSdk();
    expect(() =>
      new DeliveryProofService(fake.sdk).signedUrl(locator, DROP),
    ).toThrow(GoneException);
    expect(fake.private_download_url).not.toHaveBeenCalled();
  });

  it('without configuration: 503 for upload and proof URLs, cleanup is a no-op', async () => {
    const service = new DeliveryProofService(null);
    expect(service.isConfigured).toBe(false);
    await expect(service.uploadPhoto(DROP, JPEG)).rejects.toThrow(
      new ServiceUnavailableException(NOT_CONFIGURED_MESSAGE),
    );
    expect(() =>
      service.signedUrl(
        `delivery-proofs/${DROP}/22222222-2222-4222-8222-222222222222.jpg`,
        DROP,
      ),
    ).toThrow(ServiceUnavailableException);
    await expect(service.deletePhoto('anything')).resolves.toBeUndefined();
  });

  it('treats "not found" on destroy as success and never throws on cleanup failure', async () => {
    const fake = fakeSdk();
    const service = new DeliveryProofService(fake.sdk);
    const locator = `delivery-proofs/${DROP}/22222222-2222-4222-8222-222222222222.png`;
    fake.destroy.mockResolvedValueOnce({ result: 'not found' });
    await expect(service.deletePhoto(locator)).resolves.toBeUndefined();
    fake.destroy.mockRejectedValueOnce(new Error('network down'));
    await expect(service.deletePhoto(locator)).resolves.toBeUndefined();
    expect(fake.destroy).toHaveBeenCalledWith(
      `delivery-proofs/${DROP}/22222222-2222-4222-8222-222222222222`,
      {
        resource_type: 'image',
        type: 'authenticated',
        invalidate: true,
      },
    );
  });
});

describe('Delivery with the real proof service (SDK mocked)', () => {
  const drop = {
    driverStaffUserId: 'driver-a',
    status: DeliveryDropStatus.OUT_FOR_DELIVERY,
    deliveredAt: null,
    scheduledDeliveryAt: new Date(),
  };
  let fake: ReturnType<typeof fakeSdk>;
  let service: DriverLifecycleService;
  let updateMany: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    fake = fakeSdk();
    updateMany = vi.fn().mockResolvedValue({ count: 0 }); // lose the CAS race
    const tx = {
      $queryRaw: vi
        .fn()
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ id: 'o1', status: OrderStatus.CONFIRMED }]),
      deliveryDrop: {
        findUniqueOrThrow: vi.fn().mockResolvedValue(drop),
        updateMany,
      },
    };
    const module = await Test.createTestingModule({
      providers: [
        DriverLifecycleService,
        DeliveryProofService,
        { provide: CLOUDINARY_SDK, useValue: fake.sdk },
        {
          provide: PrismaService,
          useValue: {
            deliveryDrop: { findUnique: vi.fn().mockResolvedValue(drop) },
            $transaction: vi.fn(async (cb: (client: unknown) => unknown) =>
              cb(tx),
            ),
          },
        },
      ],
    }).compile();
    service = module.get(DriverLifecycleService);
  });

  it('destroys the just-uploaded asset when the DB transition loses the race, and returns the 409', async () => {
    await expect(
      service.markDelivered(DROP, 'driver-a', undefined, JPEG),
    ).rejects.toThrow(ConflictException);
    const uploadedId = fake.upload_stream.mock.calls[0]![0].public_id;
    expect(fake.destroy).toHaveBeenCalledWith(
      uploadedId,
      expect.objectContaining({ type: 'authenticated', invalidate: true }),
    );
    const written = updateMany.mock.calls[0]![0].data.photoUrl as string;
    expect(written).toBe(`${uploadedId}.jpg`); // the locator, not a URL
  });

  it('still returns the original 409 when cleanup itself fails', async () => {
    fake.destroy.mockRejectedValue(new Error('Cloudinary unavailable'));
    const error = await service
      .markDelivered(DROP, 'driver-a', undefined, JPEG)
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ConflictException);
    expect((error as Error).message).toMatch(/modified concurrently/);
  });
});
