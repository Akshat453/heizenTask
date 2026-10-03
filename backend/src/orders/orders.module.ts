import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller.js';
import { OrderQueryService } from './services/order-query.service.js';
import { OrderValidationService } from './services/order-validation.service.js';
import { OrderCreationService } from './services/order-creation.service.js';
import { OrderLifecycleService } from './services/order-lifecycle.service.js';
import { CutoffService } from './services/cutoff.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { BusinessTimeModule } from '../business-time/business-time.module.js';
import { MenuModule } from '../menu/menu.module.js';
import { PricingModule } from '../pricing/pricing.module.js';
import { CompaniesModule } from '../companies/companies.module.js';
import { SettingsModule } from '../settings/settings.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { StaffModule } from '../staff/staff.module.js';

import { DispatchModule } from '../dispatch/dispatch.module.js';

@Module({
  imports: [
    PrismaModule,
    BusinessTimeModule,
    MenuModule,
    PricingModule,
    CompaniesModule,
    SettingsModule,
    AuthModule,
    StaffModule,
    DispatchModule,
  ],
  controllers: [OrdersController],
  providers: [
    OrderQueryService,
    OrderValidationService,
    OrderCreationService,
    OrderLifecycleService,
    CutoffService,
  ],
  exports: [
    OrderQueryService,
    OrderValidationService,
    OrderCreationService,
    OrderLifecycleService,
    CutoffService,
  ],
})
export class OrdersModule {}
