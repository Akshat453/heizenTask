import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator.js';
import { CreateEmployeeDto, EmployeeQueryDto, UpdateEmployeeDto } from './dto/employee.dto.js';
import { EmployeesService } from './employees.service.js';
import { MenuPreviewService } from './menu-preview.service.js';

@Controller('employees')
export class EmployeesController {
  constructor(private readonly service: EmployeesService, private readonly previewService: MenuPreviewService) {}
  @Get() @RequirePermissions('employees.read') list(@Query() query: EmployeeQueryDto) { return this.service.list(query); }
  @Get(':id/menu-preview/categories/:slug') @RequirePermissions('employees.read') previewCategory(@Param('id') id: string, @Param('slug') slug: string) { return this.previewService.previewCategory(id, slug); }
  @Get(':id/menu-preview') @RequirePermissions('employees.read') preview(@Param('id') id: string) { return this.previewService.preview(id); }
  @Get(':id') @RequirePermissions('employees.read') get(@Param('id') id: string) { return this.service.get(id); }
  @Patch(':id') @RequirePermissions('employees.manage') update(@Param('id') id: string, @Body() dto: UpdateEmployeeDto) { return this.service.update(id, dto); }
}

@Controller('companies/:companyId/employees')
export class CompanyEmployeesController {
  constructor(private readonly service: EmployeesService) {}
  @Get() @RequirePermissions('employees.read') list(@Param('companyId') companyId: string, @Query() query: EmployeeQueryDto) { return this.service.listForCompany(companyId, query); }
  @Post() @RequirePermissions('employees.manage') create(@Param('companyId') companyId: string, @Body() dto: CreateEmployeeDto) { return this.service.create(companyId, dto); }
}
