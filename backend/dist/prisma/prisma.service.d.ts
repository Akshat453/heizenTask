import { OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '../generated/prisma/client.js';
export declare class PrismaService extends PrismaClient implements OnModuleDestroy {
    constructor();
    onModuleDestroy(): Promise<void>;
}
