import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { BusinessTimeService } from '../../business-time/business-time.service.js';
import { withOnTime } from '../../dispatch/drop-timing.js';

@Injectable()
export class DriverQueryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly businessTime: BusinessTimeService,
  ) {}

  /**
   * The authenticated Driver's Drops for the current BUSINESS date (configured
   * timezone, independent of the server timezone): DISPATCH_READY,
   * OUT_FOR_DELIVERY and DELIVERED, by scheduled delivery time.
   */
  async getTodayDrops(driverId: string) {
    const businessDate = await this.businessTime.getBusinessDate();
    const { start, end } =
      await this.businessTime.getBusinessDateBounds(businessDate);

    const drops = await this.prisma.deliveryDrop.findMany({
      where: {
        driverStaffUserId: driverId,
        scheduledDeliveryAt: { gte: start, lt: end },
      },
      include: {
        company: { select: { name: true, driverInstructions: true } },
        _count: { select: { orders: true } },
      },
      orderBy: [{ scheduledDeliveryAt: 'asc' }, { id: 'asc' }],
    });

    return { businessDate, data: drops.map(withOnTime) };
  }
}
