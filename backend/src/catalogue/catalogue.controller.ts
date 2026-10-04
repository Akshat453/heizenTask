import { Body, Controller, Get, Patch, Post, Query } from '@nestjs/common';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto.js';
import { IdParam } from '../common/decorators/id-param.decorator.js';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator.js';
import { CatalogueService } from './catalogue.service.js';
import {
  CreateDishDto,
  CreateOptionDto,
  DishQueryDto,
  UpdateDishDto,
  UpdateOptionDto,
} from './dto/catalogue.dto.js';

@Controller('dishes')
export class DishesController {
  constructor(private readonly service: CatalogueService) {}
  @Get() @RequirePermissions('catalogue.read') list(
    @Query() query: DishQueryDto,
  ) {
    return this.service.listDishes(query);
  }
  @Post() @RequirePermissions('catalogue.manage') create(
    @Body() dto: CreateDishDto,
  ) {
    return this.service.createDish(dto);
  }
  @Get(':id') @RequirePermissions('catalogue.read') get(@IdParam() id: string) {
    return this.service.getDish(id);
  }
  @Patch(':id') @RequirePermissions('catalogue.manage') update(
    @IdParam() id: string,
    @Body() dto: UpdateDishDto,
  ) {
    return this.service.updateDish(id, dto);
  }
  @Post(':id/deactivate') @RequirePermissions('catalogue.manage') deactivate(
    @IdParam() id: string,
  ) {
    return this.service.deactivateDish(id);
  }
}

@Controller('options')
export class OptionsController {
  constructor(private readonly service: CatalogueService) {}
  @Get() @RequirePermissions('catalogue.read') list(
    @Query() query: PaginationQueryDto,
  ) {
    return this.service.listOptions(query);
  }
  @Post() @RequirePermissions('catalogue.manage') create(
    @Body() dto: CreateOptionDto,
  ) {
    return this.service.createOption(dto);
  }
  @Get(':id') @RequirePermissions('catalogue.read') get(@IdParam() id: string) {
    return this.service.getOption(id);
  }
  @Patch(':id') @RequirePermissions('catalogue.manage') update(
    @IdParam() id: string,
    @Body() dto: UpdateOptionDto,
  ) {
    return this.service.updateOption(id, dto);
  }
}
