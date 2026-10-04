import {
  GoneException,
  Inject,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { UploadApiResponse } from 'cloudinary';
import { randomUUID } from 'crypto';
import { validateDeliveryPhoto } from '../delivery-photo.js';
import { CLOUDINARY_SDK, type CloudinarySdk } from './cloudinary-sdk.js';

/** The subset of Multer's in-memory file used for delivery proof uploads. */
export type UploadedPhoto = {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
};

/** Proof URLs are short-lived. */
export const PROOF_URL_TTL_SECONDS = 300;
export const NOT_CONFIGURED_MESSAGE = 'Photo upload is not configured';
export const PHOTO_UNAVAILABLE_MESSAGE = 'Photo unavailable';

const LOCATOR_PATTERN =
  /^(delivery-proofs\/([0-9a-f-]{36})\/[0-9a-f-]{36})\.(jpg|png|webp)$/i;
const ASSET = { resource_type: 'image', type: 'authenticated' } as const;

/**
 * Private delivery-proof photos on Cloudinary. This service owns every
 * provider detail; callers only see an opaque locator.
 * - Assets are uploaded as `type: authenticated`, never the public "upload" type.
 * - The locator stored in DeliveryDrop.photoUrl is `<public_id>.<format>`
 *   (e.g. delivery-proofs/<dropId>/<uuid>.jpg), never a URL.
 * - Viewing generates a short-lived private download URL on demand from the
 *   locator stored on an authorized Drop; callers never supply a public_id.
 * - Without CLOUDINARY_* config the app starts normally; only photo paths fail
 *   with 503, and note-only delivery keeps working.
 */
@Injectable()
export class DeliveryProofService {
  private readonly logger = new Logger(DeliveryProofService.name);

  constructor(
    @Inject(CLOUDINARY_SDK) private readonly sdk: CloudinarySdk | null,
  ) {
    if (!sdk)
      this.logger.warn(
        'CLOUDINARY_* is not configured; delivery photos are disabled (note-only delivery still works).',
      );
  }

  get isConfigured(): boolean {
    return this.sdk !== null;
  }

  /**
   * Validates the bytes (≤5 MB, JPEG/PNG/WebP by magic bytes; 400 otherwise)
   * before any network call, then uploads as an authenticated asset under a
   * server-generated public_id. Returns the locator to store.
   */
  async uploadPhoto(dropId: string, file: UploadedPhoto): Promise<string> {
    validateDeliveryPhoto(file);
    const sdk = this.requireSdk();
    const publicId = `delivery-proofs/${dropId}/${randomUUID()}`;
    let result: UploadApiResponse;
    try {
      result = await new Promise<UploadApiResponse>((resolve, reject) => {
        const stream = sdk.uploader.upload_stream(
          { ...ASSET, public_id: publicId, overwrite: false },
          (error, response) =>
            error || !response
              ? reject(error ?? new Error('Empty upload response'))
              : resolve(response),
        );
        stream.end(file.buffer);
      });
    } catch (error) {
      this.logger.error(
        `Delivery proof upload failed for drop ${dropId}: ${providerMessage(error)}`,
      );
      throw new ServiceUnavailableException(
        'Photo upload failed; the delivery was not recorded.',
      );
    }
    const locator = `${result.public_id}.${result.format}`;
    if (result.type !== 'authenticated' || !LOCATOR_PATTERN.test(locator)) {
      // Never keep an asset that is not private or not where we put it.
      await this.deletePhoto(locator);
      this.logger.error(
        `Delivery proof upload for drop ${dropId} returned an unexpected asset (type ${result.type}).`,
      );
      throw new ServiceUnavailableException(
        'Photo upload failed; the delivery was not recorded.',
      );
    }
    return locator;
  }

  /**
   * Best-effort removal of an asset whose delivery transition did not commit.
   * "Not found" counts as success; failures are logged and never thrown, so
   * the caller's original error is what the client sees.
   */
  async deletePhoto(locator: string): Promise<void> {
    if (!this.sdk) return;
    const parsed = parseLocator(locator);
    if (!parsed) return;
    try {
      const result = (await this.sdk.uploader.destroy(parsed.publicId, {
        ...ASSET,
        invalidate: true,
      })) as { result?: string } | undefined;
      if (result?.result && !['ok', 'not found'].includes(result.result))
        this.logger.warn(
          `Delivery proof cleanup for ${parsed.publicId} returned "${result.result}".`,
        );
    } catch (error) {
      this.logger.error(
        `Delivery proof cleanup failed for ${parsed.publicId}: ${providerMessage(error)}`,
      );
    }
  }

  /**
   * Short-lived private download URL for the locator stored on an authorized
   * Drop. A locator not in the expected format (or not belonging to that
   * Drop) is reported as 410 "Photo unavailable", never a 500.
   */
  signedUrl(locator: string, dropId: string): string {
    const sdk = this.requireSdk();
    const parsed = parseLocator(locator);
    if (!parsed || parsed.dropId.toLowerCase() !== dropId.toLowerCase())
      throw new GoneException(PHOTO_UNAVAILABLE_MESSAGE);
    return sdk.utils.private_download_url(parsed.publicId, parsed.format, {
      ...ASSET,
      expires_at: Math.floor(Date.now() / 1000) + PROOF_URL_TTL_SECONDS,
      attachment: false,
    });
  }

  private requireSdk(): CloudinarySdk {
    if (!this.sdk)
      throw new ServiceUnavailableException(NOT_CONFIGURED_MESSAGE);
    return this.sdk;
  }
}

/** `<public_id>.<format>` → its parts; null for anything else (e.g. a legacy key). */
export function parseLocator(
  locator: string,
): { publicId: string; format: string; dropId: string } | null {
  const match = LOCATOR_PATTERN.exec(locator);
  return match
    ? {
        publicId: match[1]!,
        dropId: match[2]!,
        format: match[3]!.toLowerCase(),
      }
    : null;
}

/** Safe, credential-free description of a provider error for logs. */
function providerMessage(error: unknown): string {
  if (error && typeof error === 'object') {
    const { http_code, message } = error as {
      http_code?: number;
      message?: string;
    };
    return `${http_code ?? 'error'} ${message ?? ''}`.trim();
  }
  return 'unknown error';
}
