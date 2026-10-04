import { ConflictException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';

export function rethrowKnownPrismaError(error: unknown): never {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  ) {
    throw new ConflictException(
      'A record with that unique value already exists.',
    );
  }
  throw error;
}
