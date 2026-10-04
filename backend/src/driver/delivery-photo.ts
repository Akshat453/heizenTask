import { BadRequestException, PayloadTooLargeException } from '@nestjs/common';

/** Maximum accepted delivery-proof photo size (5 MB). */
export const MAX_DELIVERY_PHOTO_BYTES = 5 * 1024 * 1024;

export type DetectedImage = {
  contentType: 'image/jpeg' | 'image/png' | 'image/webp';
  extension: 'jpg' | 'png' | 'webp';
};

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const startsWith = (bytes: Buffer, signature: number[], offset = 0) =>
  bytes.length >= offset + signature.length &&
  signature.every((value, index) => bytes[offset + index] === value);
const ascii = (text: string) => Array.from(Buffer.from(text, 'ascii'));

/** Identifies JPEG, PNG or WebP from the file's leading bytes; anything else (SVG, HTML, …) is null. */
export function detectImageType(bytes: Buffer): DetectedImage | null {
  if (startsWith(bytes, [0xff, 0xd8, 0xff]))
    return { contentType: 'image/jpeg', extension: 'jpg' };
  if (startsWith(bytes, PNG_SIGNATURE))
    return { contentType: 'image/png', extension: 'png' };
  if (startsWith(bytes, ascii('RIFF')) && startsWith(bytes, ascii('WEBP'), 8))
    return { contentType: 'image/webp', extension: 'webp' };
  return null;
}

/**
 * Validates an uploaded proof photo by size and actual content. The request
 * MIME type and filename are ignored: the stored type/extension come from the
 * detected bytes only.
 */
export function validateDeliveryPhoto(file: {
  buffer: Buffer;
  size: number;
}): DetectedImage {
  const size = file.buffer.length;
  if (size === 0) throw new BadRequestException('Photo is empty.');
  if (size > MAX_DELIVERY_PHOTO_BYTES || file.size > MAX_DELIVERY_PHOTO_BYTES)
    throw new PayloadTooLargeException('Photo must be 5 MB or smaller.');
  const detected = detectImageType(file.buffer);
  if (!detected)
    throw new BadRequestException('Photo must be a JPEG, PNG or WebP image.');
  return detected;
}
