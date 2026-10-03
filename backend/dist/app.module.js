var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
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
let AppModule = class AppModule {
};
AppModule = __decorate([
    Module({
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
], AppModule);
export { AppModule };
//# sourceMappingURL=app.module.js.map