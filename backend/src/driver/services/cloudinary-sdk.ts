import type { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';

/**
 * The Cloudinary SDK boundary used only by DeliveryProofService. The factory
 * configures the SDK once (secure URLs) and returns null when the
 * CLOUDINARY_* variables are absent; a partial set already fails startup in
 * config/environment.ts. Tests override this token with a fake.
 */
export const CLOUDINARY_SDK = Symbol('CLOUDINARY_SDK');

export type CloudinarySdk = Pick<typeof cloudinary, 'uploader' | 'utils'>;

export const cloudinarySdkProvider: Provider = {
  provide: CLOUDINARY_SDK,
  inject: [ConfigService],
  useFactory: (config: ConfigService): CloudinarySdk | null => {
    const cloudName = config.get<string>('CLOUDINARY_CLOUD_NAME');
    const apiKey = config.get<string>('CLOUDINARY_API_KEY');
    const apiSecret = config.get<string>('CLOUDINARY_API_SECRET');
    if (!cloudName || !apiKey || !apiSecret) return null;
    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true,
    });
    return cloudinary;
  },
};
