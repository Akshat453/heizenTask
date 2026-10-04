import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  constructor(config: ConfigService) {
    const adapter = new PrismaPg({
      connectionString: config.getOrThrow<string>('DATABASE_URL'),
    });

    // Interactive transactions may wait on row/advisory locks, and a remote
    // database (e.g. Neon, ~250ms RTT) makes each statement slow, so Prisma's
    // 2s maxWait / 5s timeout defaults are too tight.
    super({
      adapter,
      transactionOptions: { maxWait: 10_000, timeout: 30_000 },
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
