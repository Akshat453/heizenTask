import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import { validateDeliveryPhoto } from '../delivery-photo.js';

/** The subset of Multer's in-memory file used for delivery proof uploads. */
export type UploadedPhoto = {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
};

/** Proof URLs are short-lived. */
export const PROOF_URL_TTL_SECONDS = 300;

/**
 * Private S3 storage for delivery proof photos.
 * - AWS_S3_BUCKET is optional: without it the app starts normally, note-only
 *   delivery works, and only photo upload/view is unavailable.
 * - AWS_REGION defaults to us-east-1; credentials come from the standard AWS
 *   provider chain (never from request data, never sent to clients).
 * - Only the server-generated object key is persisted (in DeliveryDrop.photoUrl).
 */
@Injectable()
export class DeliveryProofService {
  private readonly logger = new Logger(DeliveryProofService.name);
  private readonly bucket: string | null;
  private readonly region: string;
  private client: S3Client | null = null;

  constructor(config: ConfigService) {
    this.bucket = config.get<string>('AWS_S3_BUCKET')?.trim() || null;
    this.region = config.get<string>('AWS_REGION')?.trim() || 'us-east-1';
    if (!this.bucket)
      this.logger.warn(
        'AWS_S3_BUCKET is not configured; delivery photos are disabled (note-only delivery still works).',
      );
  }

  get isConfigured(): boolean {
    return this.bucket !== null;
  }

  /** Validates the bytes (≤5 MB, JPEG/PNG/WebP by magic bytes) and uploads under a server-generated key. */
  async uploadPhoto(dropId: string, file: UploadedPhoto): Promise<string> {
    const { contentType, extension } = validateDeliveryPhoto(file);
    const bucket = this.requireBucket();
    const key = `delivery-proofs/${dropId}/${randomUUID()}.${extension}`;
    try {
      await this.s3().send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: file.buffer,
          ContentType: contentType,
        }),
      );
      return key;
    } catch (error) {
      this.logger.error(
        `Failed to upload delivery proof for drop ${dropId}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw new ServiceUnavailableException(
        'Photo upload failed; the delivery was not recorded.',
      );
    }
  }

  /** Best-effort removal of an uploaded object whose delivery transition did not commit. */
  async deletePhoto(key: string): Promise<void> {
    if (!this.bucket) return;
    try {
      await this.s3().send(
        new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
      );
    } catch (error) {
      this.logger.error(
        `Failed to delete orphaned delivery proof ${key}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  /** Short-lived presigned GET for a key read from an authorized Drop (never a client-supplied key). */
  async generatePresignedUrl(key: string): Promise<string> {
    const bucket = this.requireBucket();
    return getSignedUrl(
      this.s3(),
      new GetObjectCommand({ Bucket: bucket, Key: key }),
      { expiresIn: PROOF_URL_TTL_SECONDS },
    );
  }

  private requireBucket(): string {
    if (!this.bucket)
      throw new ServiceUnavailableException(
        'Photo storage is not configured on this server.',
      );
    return this.bucket;
  }

  private s3(): S3Client {
    this.client ??= new S3Client({ region: this.region });
    return this.client;
  }
}
