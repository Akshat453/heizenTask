import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule } from './auth/auth.module.js';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard.js';
import { BusinessTimeModule } from './business-time/business-time.module.js';
import { CatalogueModule } from './catalogue/catalogue.module.js';
import { PermissionsGuard } from './common/guards/permissions.guard.js';
import { CompaniesModule } from './companies/companies.module.js';
import { validateEnvironment } from './config/environment.js';
import { EmployeesModule } from './employees/employees.module.js';
import { HealthModule } from './health/health.module.js';
import { MenuModule } from './menu/menu.module.js';
import { PricingModule } from './pricing/pricing.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { ReferenceDataModule } from './reference-data/reference-data.module.js';
import { SettingsModule } from './settings/settings.module.js';
import { StaffModule } from './staff/staff.module.js';
import { OrdersModule } from './orders/orders.module.js';
import { KitchenModule } from './kitchen/kitchen.module.js';
import { DispatchModule } from './dispatch/dispatch.module.js';
import { DriverModule } from './driver/driver.module.js';
import { BillingModule } from './billing/billing.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnvironment,
    }),
    PrismaModule,
    StaffModule,
    AuthModule,
    HealthModule,
    ReferenceDataModule,
    CatalogueModule,
    MenuModule,
    PricingModule,
    CompaniesModule,
    EmployeesModule,
    SettingsModule,
    BusinessTimeModule,
    OrdersModule,
    KitchenModule,
    DispatchModule,
    DriverModule,
    BillingModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PermissionsGuard,
    },
  ],
})
export class AppModule {}
