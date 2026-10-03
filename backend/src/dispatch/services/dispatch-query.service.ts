import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { BusinessTimeService } from '../../business-time/business-time.service.js';
import { DispatchQueryDto } from '../dto/dispatch.dto.js';
import { DeliveryProofService } from '../../driver/services/delivery-proof.service.js';

@Injectable()
export class DispatchQueryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly businessTime: BusinessTimeService,
    private readonly proofService: DeliveryProofService,
  ) {}

  async list(query: DispatchQueryDto) {
    let dateFilter = {};
    if (query.date) {
      // Use BusinessTimeService to get the UTC bounds for this business date
      const { start, end } = await this.businessTime.getBusinessDateBounds(query.date);
      dateFilter = {
        scheduledDeliveryAt: {
          gte: start,
          lt: end,
        },
      };
    }

    const where = {
      ...dateFilter,
      ...(query.status && { status: query.status }),
      ...(query.companyId && { companyId: query.companyId }),
    };

    const data = await this.prisma.deliveryDrop.findMany({
      where,
      include: {
        company: { select: { name: true } },
        driver: { select: { name: true } },
        _count: { select: { orders: true } },
      },
      orderBy: { scheduledDeliveryAt: 'asc' },
    });

    return { data };
  }

  async getProofUrl(id: string) {
    const drop = await this.prisma.deliveryDrop.findUnique({
      where: { id },
      select: { photoUrl: true },
    });

    if (!drop) throw new NotFoundException('Delivery drop not found');
    if (!drop.photoUrl) throw new BadRequestException('No proof photo exists for this delivery');

    const url = await this.proofService.generatePresignedUrl(drop.photoUrl);
    return { url };
  }
}
