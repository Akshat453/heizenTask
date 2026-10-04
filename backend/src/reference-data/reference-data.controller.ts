import { Body, Controller, Get, Patch, Post, Query } from '@nestjs/common';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto.js';
import { IdParam } from '../common/decorators/id-param.decorator.js';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator.js';
import {
  CreateNamedReferenceDto,
  CreateOrderedReferenceDto,
  UpdateNamedReferenceDto,
  UpdateOrderedReferenceDto,
} from './dto/reference-data.dto.js';
import { ReferenceDataService } from './reference-data.service.js';

@Controller('allergens')
export class AllergensController {
  constructor(private readonly service: ReferenceDataService) {}
  @Get() @RequirePermissions('catalogue.read') list(
    @Query() query: PaginationQueryDto,
  ) {
    return this.service.list('allergen', query);
  }
  @Post() @RequirePermissions('catalogue.manage') create(
    @Body() dto: CreateNamedReferenceDto,
  ) {
    return this.service.create('allergen', dto);
  }
  @Patch(':id') @RequirePermissions('catalogue.manage') update(
    @IdParam() id: string,
    @Body() dto: UpdateNamedReferenceDto,
  ) {
    return this.service.update('allergen', id, dto);
  }
}

@Controller('dietary-tags')
export class DietaryTagsController {
  constructor(private readonly service: ReferenceDataService) {}
  @Get() @RequirePermissions('catalogue.read') list(
    @Query() query: PaginationQueryDto,
  ) {
    return this.service.list('dietaryTag', query);
  }
  @Post() @RequirePermissions('catalogue.manage') create(
    @Body() dto: CreateNamedReferenceDto,
  ) {
    return this.service.create('dietaryTag', dto);
  }
  @Patch(':id') @RequirePermissions('catalogue.manage') update(
    @IdParam() id: string,
    @Body() dto: UpdateNamedReferenceDto,
  ) {
    return this.service.update('dietaryTag', id, dto);
  }
}

@Controller('kitchen-stations')
export class KitchenStationsController {
  constructor(private readonly service: ReferenceDataService) {}
  @Get() @RequirePermissions('catalogue.read') list(
    @Query() query: PaginationQueryDto,
  ) {
    return this.service.list('kitchenStation', query);
  }
  @Post() @RequirePermissions('catalogue.manage') create(
    @Body() dto: CreateOrderedReferenceDto,
  ) {
    return this.service.create('kitchenStation', dto);
  }
  @Patch(':id') @RequirePermissions('catalogue.manage') update(
    @IdParam() id: string,
    @Body() dto: UpdateOrderedReferenceDto,
  ) {
    return this.service.update('kitchenStation', id, dto);
  }
}

@Controller('portion-sizes')
export class PortionSizesController {
  constructor(private readonly service: ReferenceDataService) {}
  @Get() @RequirePermissions('catalogue.read') list(
    @Query() query: PaginationQueryDto,
  ) {
    return this.service.list('portionSize', query);
  }
  @Post() @RequirePermissions('catalogue.manage') create(
    @Body() dto: CreateOrderedReferenceDto,
  ) {
    return this.service.create('portionSize', dto);
  }
  @Patch(':id') @RequirePermissions('catalogue.manage') update(
    @IdParam() id: string,
    @Body() dto: UpdateOrderedReferenceDto,
  ) {
    return this.service.update('portionSize', id, dto);
  }
}

@Controller('packaging-types')
export class PackagingTypesController {
  constructor(private readonly service: ReferenceDataService) {}
  @Get() @RequirePermissions('catalogue.read') list(
    @Query() query: PaginationQueryDto,
  ) {
    return this.service.list('packagingType', query);
  }
  @Post() @RequirePermissions('catalogue.manage') create(
    @Body() dto: CreateOrderedReferenceDto,
  ) {
    return this.service.create('packagingType', dto);
  }
  @Patch(':id') @RequirePermissions('catalogue.manage') update(
    @IdParam() id: string,
    @Body() dto: UpdateOrderedReferenceDto,
  ) {
    return this.service.update('packagingType', id, dto);
  }
}
