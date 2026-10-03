import { OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '../generated/prisma/client.js';
export declare class PrismaService extends PrismaClient implements OnModuleDestroy {
    constructor(config: ConfigService);
    onModuleDestroy(): Promise<void>;
}
