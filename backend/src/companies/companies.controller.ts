import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator.js';
import { CompaniesService } from './companies.service.js';
import { CompanyQueryDto, CreateCompanyDto, UpdateCompanyDto } from './dto/company.dto.js';

@Controller('companies')
export class CompaniesController {
  constructor(private readonly service: CompaniesService) {}
  @Get() @RequirePermissions('companies.read') list(@Query() query: CompanyQueryDto) { return this.service.list(query); }
  @Post() @RequirePermissions('companies.manage') create(@Body() dto: CreateCompanyDto) { return this.service.create(dto); }
  @Get(':id') @RequirePermissions('companies.read') get(@Param('id') id: string) { return this.service.get(id); }
  @Patch(':id') @RequirePermissions('companies.manage') update(@Param('id') id: string, @Body() dto: UpdateCompanyDto) { return this.service.update(id, dto); }
}
