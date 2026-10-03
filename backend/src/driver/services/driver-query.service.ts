import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { BusinessTimeService } from '../../business-time/business-time.service.js';

@Injectable()
export class DriverQueryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly businessTime: BusinessTimeService,
  ) {}

  async getTodayDrops(driverId: string) {
    // Determine the current business date
    const now = new Date();
    // Assuming businessTime.getBusinessDateBounds for today's date
    const tz = await this.businessTime.getTimezone();
    const isoToday = new Date(now.toLocaleString('en-US', { timeZone: tz })).toISOString().split('T')[0]!;
    
    const { start, end } = await this.businessTime.getBusinessDateBounds(isoToday);

    const data = await this.prisma.deliveryDrop.findMany({
      where: {
        driverStaffUserId: driverId,
        scheduledDeliveryAt: {
          gte: start,
          lt: end,
        }
      },
      include: {
        company: { select: { name: true, driverInstructions: true } },
        _count: { select: { orders: true } },
      },
      orderBy: { scheduledDeliveryAt: 'asc' },
    });

    return { data };
  }
}
