import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import * as path from 'path';

@Injectable()
export class DeliveryProofService {
  private readonly logger = new Logger(DeliveryProofService.name);
  private s3Client: S3Client | null = null;
  private bucket: string | null = null;

  constructor() {
    this.bucket = process.env.AWS_S3_BUCKET || null;
    
    // Attempt to instantiate S3 Client, do not throw if missing config
    // Relying on AWS credential chain. 
    try {
      this.s3Client = new S3Client({
        region: process.env.AWS_REGION || 'us-east-1',
        // Note: accessKeyId and secretAccessKey can be picked up from env automatically by the SDK
      });
      if (!this.bucket) {
        this.logger.warn('AWS_S3_BUCKET is not configured. Delivery photos will not be supported.');
      }
    } catch (error) {
      this.logger.warn('Failed to configure S3Client, photo uploads will be disabled.', error);
    }
  }

  /**
   * Uploads a file to S3 and returns the object key.
   */
  async uploadPhoto(dropId: string, file: Express.Multer.File): Promise<string> {
    if (!this.s3Client || !this.bucket) {
      throw new BadRequestException('S3 is not configured for photo uploads on this server');
    }

    const ext = path.extname(file.originalname) || '.jpg';
    const key = `delivery-proofs/${dropId}/${randomUUID()}${ext}`;

    try {
      await this.s3Client.send(new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      }));
      return key;
    } catch (err) {
      this.logger.error(`Failed to upload photo for drop ${dropId}`, err);
      throw new BadRequestException('Failed to upload photo proof');
    }
  }

  /**
   * Best-effort deletion if DB transaction fails.
   */
  async deletePhoto(key: string) {
    if (!this.s3Client || !this.bucket) return;
    try {
      await this.s3Client.send(new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }));
    } catch (err) {
      this.logger.error(`Failed to delete orphaned photo ${key}`, err);
    }
  }

  /**
   * Generates a presigned GET URL for an object key.
   */
  async generatePresignedUrl(key: string): Promise<string> {
    if (!this.s3Client || !this.bucket) {
      throw new BadRequestException('S3 is not configured');
    }
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });
    // URL expires in 15 minutes
    return getSignedUrl(this.s3Client, command, { expiresIn: 900 });
  }
}
