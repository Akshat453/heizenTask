import { PrismaService } from '../prisma/prisma.service.js';
export declare class HealthController {
    private readonly prisma;
    constructor(prisma: PrismaService);
    apiHealth(): {
        status: string;
        service: string;
    };
    databaseHealth(): Promise<{
        status: string;
        database: string;
    }>;
}
