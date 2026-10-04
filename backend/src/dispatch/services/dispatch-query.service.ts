import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { BusinessTimeService } from '../../business-time/business-time.service.js';
import { DispatchQueryDto } from '../dto/dispatch.dto.js';
import {
  DeliveryProofService,
  PROOF_URL_TTL_SECONDS,
} from '../../driver/services/delivery-proof.service.js';
import { dropPlannedDispatchReadyAt, withOnTime } from '../drop-timing.js';
import { dropOrdersSelect, summarizeDropOrders } from '../drop-orders.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { pageArgs, paginate } from '../../common/dto/pagination-query.dto.js';

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
      const { start, end } = await this.businessTime.getBusinessDateBounds(
        query.date,
      );
      dateFilter = {
        scheduledDeliveryAt: {
          gte: start,
          lt: end,
        },
      };
    }

    const search = query.search?.trim();
    const contains = (value: string) => ({
      contains: value,
      mode: 'insensitive' as const,
    });
    const where: Prisma.DeliveryDropWhereInput = {
      ...dateFilter,
      ...(query.status && { status: query.status }),
      ...(query.companyId && { companyId: query.companyId }),
      ...(query.driverId && {
        driverStaffUserId: query.driverId === 'none' ? null : query.driverId,
      }),
      ...(search && {
        OR: [
          { company: { name: contains(search) } },
          { addressLabelSnapshot: contains(search) },
          { addressLine1Snapshot: contains(search) },
          { addressLine2Snapshot: contains(search) },
          { addressCitySnapshot: contains(search) },
          { driver: { name: contains(search) } },
        ],
      }),
    };

    const [data, totalItems] = await this.prisma.$transaction([
      this.prisma.deliveryDrop.findMany({
        where,
        include: {
          company: { select: { name: true } },
          driver: { select: { name: true } },
          _count: { select: { orders: true } },
          orders: { select: dropOrdersSelect },
        },
        orderBy: [{ scheduledDeliveryAt: 'asc' }, { id: 'asc' }],
        ...pageArgs(query),
      }),
      this.prisma.deliveryDrop.count({ where }),
    ]);
    return paginate(
      data.map(({ orders, ...drop }) => ({
        ...withOnTime(drop),
        ...summarizeDropOrders(orders),
        plannedDispatchReadyAt: dropPlannedDispatchReadyAt({
          scheduledDeliveryAt: drop.scheduledDeliveryAt,
          orders,
        }),
      })),
      totalItems,
      query.page,
      query.pageSize,
    );
  }

  async getProofUrl(id: string) {
    const drop = await this.prisma.deliveryDrop.findUnique({
      where: { id },
      select: { photoUrl: true },
    });

    if (!drop) throw new NotFoundException('Delivery drop not found');
    if (!drop.photoUrl)
      throw new NotFoundException('No proof photo exists for this delivery.');

    // The locator always comes from the authorized Drop row, never from the request.
    const url = this.proofService.signedUrl(drop.photoUrl, id);
    return { url, expiresInSeconds: PROOF_URL_TTL_SECONDS };
  }
}
