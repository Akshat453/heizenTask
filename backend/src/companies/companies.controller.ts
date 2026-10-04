import { Body, Controller, Get, Patch, Post, Query } from '@nestjs/common';
import { IdParam } from '../common/decorators/id-param.decorator.js';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator.js';
import { CompaniesService } from './companies.service.js';
import {
  CompanyQueryDto,
  CreateCompanyDto,
  UpdateCompanyDto,
} from './dto/company.dto.js';

@Controller('companies')
export class CompaniesController {
  constructor(private readonly service: CompaniesService) {}
  @Get() @RequirePermissions('companies.read') list(
    @Query() query: CompanyQueryDto,
  ) {
    return this.service.list(query);
  }
  @Post() @RequirePermissions('companies.manage') create(
    @Body() dto: CreateCompanyDto,
  ) {
    return this.service.create(dto);
  }
  @Get(':id') @RequirePermissions('companies.read') get(@IdParam() id: string) {
    return this.service.get(id);
  }
  @Patch(':id') @RequirePermissions('companies.manage') update(
    @IdParam() id: string,
    @Body() dto: UpdateCompanyDto,
  ) {
    return this.service.update(id, dto);
  }
}
