import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ExceptionFilter,
  PayloadTooLargeException,
} from '@nestjs/common';
import type { Response } from 'express';
import { PHOTO_TOO_LARGE_MESSAGE } from './delivery-photo.js';

/**
 * Multer rejects files over the upload limit with 413 before the service runs;
 * the delivery API reports every invalid photo (including too large) as 400.
 */
@Catch(PayloadTooLargeException)
export class PhotoSizeFilter implements ExceptionFilter {
  catch(_exception: PayloadTooLargeException, host: ArgumentsHost) {
    const error = new BadRequestException(PHOTO_TOO_LARGE_MESSAGE);
    host
      .switchToHttp()
      .getResponse<Response>()
      .status(error.getStatus())
      .json(error.getResponse());
  }
}
