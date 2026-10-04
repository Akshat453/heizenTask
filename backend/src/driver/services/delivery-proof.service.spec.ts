import {
  BadRequestException,
  PayloadTooLargeException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  detectImageType,
  MAX_DELIVERY_PHOTO_BYTES,
  validateDeliveryPhoto,
} from '../delivery-photo.js';
import {
  DeliveryProofService,
  type UploadedPhoto,
} from './delivery-proof.service.js';

const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]);
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
const WEBP = Buffer.concat([
  Buffer.from('RIFF'),
  Buffer.from([0x24, 0, 0, 0]),
  Buffer.from('WEBPVP8 '),
]);
const SVG = Buffer.from(
  '<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg"></svg>',
);
const HTML = Buffer.from('<!doctype html><script>alert(1)</script>');

const photo = (
  buffer: Buffer,
  overrides: Partial<UploadedPhoto> = {},
): UploadedPhoto => ({
  buffer,
  size: buffer.length,
  mimetype: 'image/jpeg',
  originalname: 'proof.jpg',
  ...overrides,
});
const service = (env: Record<string, string | undefined>) =>
  new DeliveryProofService(new ConfigService(env));

describe('delivery photo validation (magic bytes)', () => {
  it('detects JPEG, PNG and WebP from content', () => {
    expect(detectImageType(JPEG)).toEqual({
      contentType: 'image/jpeg',
      extension: 'jpg',
    });
    expect(detectImageType(PNG)).toEqual({
      contentType: 'image/png',
      extension: 'png',
    });
    expect(detectImageType(WEBP)).toEqual({
      contentType: 'image/webp',
      extension: 'webp',
    });
  });

  it('rejects SVG, HTML, unknown and empty files regardless of claimed MIME/filename', () => {
    for (const bytes of [SVG, HTML, Buffer.from('GIF89a......')]) {
      expect(() =>
        validateDeliveryPhoto(
          photo(bytes, { mimetype: 'image/png', originalname: 'innocent.png' }),
        ),
      ).toThrow(BadRequestException);
    }
    expect(() => validateDeliveryPhoto(photo(Buffer.alloc(0)))).toThrow(
      /empty/,
    );
  });

  it('ignores a spoofed MIME type: content decides', () => {
    expect(
      validateDeliveryPhoto(
        photo(PNG, { mimetype: 'text/html', originalname: 'x.html' }),
      ),
    ).toEqual({ contentType: 'image/png', extension: 'png' });
  });

  it('accepts exactly 5 MB and rejects one byte more', () => {
    const atLimit = Buffer.concat([
      JPEG,
      Buffer.alloc(MAX_DELIVERY_PHOTO_BYTES - JPEG.length),
    ]);
    expect(validateDeliveryPhoto(photo(atLimit)).extension).toBe('jpg');
    const overLimit = Buffer.concat([atLimit, Buffer.alloc(1)]);
    expect(() => validateDeliveryPhoto(photo(overLimit))).toThrow(
      PayloadTooLargeException,
    );
  });
});

describe('DeliveryProofService (S3 mocked; no AWS access)', () => {
  afterEach(() => vi.restoreAllMocks());

  it('starts without S3 configuration and refuses photo storage cleanly', async () => {
    const unconfigured = service({});
    expect(unconfigured.isConfigured).toBe(false);
    await expect(unconfigured.uploadPhoto('drop', photo(JPEG))).rejects.toThrow(
      ServiceUnavailableException,
    );
    await expect(unconfigured.generatePresignedUrl('key')).rejects.toThrow(
      ServiceUnavailableException,
    );
    await expect(unconfigured.deletePhoto('key')).resolves.toBeUndefined();
  });

  it('validates before touching S3 and stores under a server-generated key with the detected type', async () => {
    const send = vi
      .spyOn(S3Client.prototype, 'send')
      .mockResolvedValue({} as never);
    const configured = service({
      AWS_S3_BUCKET: 'proofs',
      AWS_REGION: 'ap-south-1',
    });

    await expect(
      configured.uploadPhoto('drop-1', photo(SVG, { mimetype: 'image/jpeg' })),
    ).rejects.toThrow(BadRequestException);
    expect(send).not.toHaveBeenCalled();

    const key = await configured.uploadPhoto(
      'drop-1',
      photo(WEBP, { mimetype: 'image/jpeg', originalname: '../../evil.exe' }),
    );
    expect(key).toMatch(/^delivery-proofs\/drop-1\/[0-9a-f-]{36}\.webp$/);
    const command = send.mock.calls[0]![0] as PutObjectCommand;
    expect(command).toBeInstanceOf(PutObjectCommand);
    expect(command.input).toMatchObject({
      Bucket: 'proofs',
      Key: key,
      ContentType: 'image/webp',
    });
  });

  it('maps an upload failure to 503 and deletes best-effort without throwing', async () => {
    const send = vi
      .spyOn(S3Client.prototype, 'send')
      .mockRejectedValue(new Error('network down'));
    const configured = service({ AWS_S3_BUCKET: 'proofs' });
    await expect(configured.uploadPhoto('drop-1', photo(JPEG))).rejects.toThrow(
      ServiceUnavailableException,
    );
    await expect(
      configured.deletePhoto('delivery-proofs/drop-1/x.jpg'),
    ).resolves.toBeUndefined();
    expect(send.mock.calls.at(-1)![0]).toBeInstanceOf(DeleteObjectCommand);
  });
});
