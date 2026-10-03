import { Module } from '@nestjs/common';
import { KitchenController } from './kitchen.controller.js';
import { KitchenQueryService } from './services/kitchen-query.service.js';
import { KitchenLifecycleService } from './services/kitchen-lifecycle.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { SettingsModule } from '../settings/settings.module.js';
import { BusinessTimeModule } from '../business-time/business-time.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { StaffModule } from '../staff/staff.module.js';
import { DispatchModule } from '../dispatch/dispatch.module.js';

@Module({
  imports: [
    PrismaModule,
    SettingsModule,
    BusinessTimeModule,
    AuthModule,
    StaffModule,
    DispatchModule,
  ],
  controllers: [KitchenController],
  providers: [KitchenQueryService, KitchenLifecycleService],
})
export class KitchenModule {}
