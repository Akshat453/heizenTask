import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { SettingsModule } from '../settings/settings.module.js';
import { BusinessTimeModule } from '../business-time/business-time.module.js';

import { DashboardController } from './dashboard.controller.js';
import { AdminDashboardService } from './services/admin-dashboard.service.js';
import { KitchenDashboardService } from './services/kitchen-dashboard.service.js';
import { DispatchDashboardService } from './services/dispatch-dashboard.service.js';
import { DriverDashboardService } from './services/driver-dashboard.service.js';

@Module({
  imports: [PrismaModule, SettingsModule, BusinessTimeModule],
  controllers: [DashboardController],
  providers: [
    AdminDashboardService,
    KitchenDashboardService,
    DispatchDashboardService,
    DriverDashboardService,
  ],
})
export class DashboardModule {}
