import { Module } from '@nestjs/common';
import { MenuModule } from '../menu/menu.module.js';
import {
  CompanyEmployeesController,
  EmployeesController,
} from './employees.controller.js';
import { EmployeesService } from './employees.service.js';
import { MenuPreviewService } from './menu-preview.service.js';

@Module({
  imports: [MenuModule],
  controllers: [EmployeesController, CompanyEmployeesController],
  providers: [EmployeesService, MenuPreviewService],
  exports: [EmployeesService, MenuPreviewService],
})
export class EmployeesModule {}
