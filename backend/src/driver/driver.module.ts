import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { BusinessTimeModule } from '../business-time/business-time.module.js';
import { DriverController } from './driver.controller.js';
import { DriverQueryService } from './services/driver-query.service.js';
import { DeliveryProofService } from './services/delivery-proof.service.js';
import { DriverLifecycleService } from './services/driver-lifecycle.service.js';

import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [PrismaModule, BusinessTimeModule, AuthModule],
  controllers: [DriverController],
  providers: [
    DriverQueryService,
    DeliveryProofService,
    DriverLifecycleService,
  ],
  exports: [DeliveryProofService],
})
export class DriverModule {}
