import { Module } from '@nestjs/common';
import { PricingModule } from '../pricing/pricing.module.js';
import { CompanyEmployeesController, EmployeesController } from './employees.controller.js';
import { EmployeesService } from './employees.service.js';
import { MenuPreviewService } from './menu-preview.service.js';

@Module({ imports: [PricingModule], controllers: [EmployeesController, CompanyEmployeesController], providers: [EmployeesService, MenuPreviewService], exports: [EmployeesService, MenuPreviewService] })
export class EmployeesModule {}
