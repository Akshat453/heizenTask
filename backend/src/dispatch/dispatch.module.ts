import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { BusinessTimeModule } from '../business-time/business-time.module.js';
import { DispatchController } from './dispatch.controller.js';
import { DispatchQueryService } from './services/dispatch-query.service.js';
import { DeliveryGroupingService } from './services/delivery-grouping.service.js';
import { DispatchLifecycleService } from './services/dispatch-lifecycle.service.js';

@Module({
  imports: [PrismaModule, BusinessTimeModule],
  controllers: [DispatchController],
  providers: [
    DispatchQueryService,
    DeliveryGroupingService,
    DispatchLifecycleService,
  ],
  exports: [DeliveryGroupingService],
})
export class DispatchModule {}
