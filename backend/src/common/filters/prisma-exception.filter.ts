import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import { Prisma } from '../../generated/prisma/client.js';

type Mapped = { status: HttpStatus; message: string };

/**
 * Maps Prisma errors that reach the HTTP boundary without domain handling:
 *   P2002 unique violation        → 409
 *   P2003 foreign-key violation   → 409
 *   P2034 write conflict/deadlock → 409 (retryable concurrency loss)
 *   P2025 record not found        → 404
 *   anything else                 → generic 500 (details logged, never returned)
 * Services still translate errors whose domain meaning they know; this is the
 * safety net so Prisma internals never leak.
 */
export function mapPrismaError(error: unknown): Mapped {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002':
        return {
          status: HttpStatus.CONFLICT,
          message: 'A record with the same unique value already exists.',
        };
      case 'P2003':
        return {
          status: HttpStatus.CONFLICT,
          message: 'The operation conflicts with related records.',
        };
      case 'P2034':
        return {
          status: HttpStatus.CONFLICT,
          message:
            'The request conflicted with a concurrent change; please retry.',
        };
      case 'P2025':
        return { status: HttpStatus.NOT_FOUND, message: 'Record not found.' };
    }
  }
  return {
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    message: 'Internal server error',
  };
}

@Catch(
  Prisma.PrismaClientKnownRequestError,
  Prisma.PrismaClientUnknownRequestError,
  Prisma.PrismaClientValidationError,
  Prisma.PrismaClientInitializationError,
  Prisma.PrismaClientRustPanicError,
)
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaExceptionFilter.name);

  catch(error: Error, host: ArgumentsHost): void {
    const { status, message } = mapPrismaError(error);
    const code =
      error instanceof Prisma.PrismaClientKnownRequestError
        ? error.code
        : error.constructor.name;
    if (status === HttpStatus.INTERNAL_SERVER_ERROR)
      this.logger.error(`Unhandled database error (${code})`, error.stack);
    else this.logger.warn(`Mapped database error ${code} → ${status}`);
    host
      .switchToHttp()
      .getResponse<Response>()
      .status(status)
      .json({ statusCode: status, message, error: HttpStatus[status] });
  }
}
