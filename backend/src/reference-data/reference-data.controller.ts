import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator.js';
import { CreateNamedReferenceDto, CreateOrderedReferenceDto, UpdateNamedReferenceDto, UpdateOrderedReferenceDto } from './dto/reference-data.dto.js';
import { ReferenceDataService } from './reference-data.service.js';

@Controller('allergens')
export class AllergensController {
  constructor(private readonly service: ReferenceDataService) {}
  @Get() @RequirePermissions('catalogue.read') list() { return this.service.list('allergen'); }
  @Post() @RequirePermissions('catalogue.manage') create(@Body() dto: CreateNamedReferenceDto) { return this.service.create('allergen', dto); }
  @Patch(':id') @RequirePermissions('catalogue.manage') update(@Param('id') id: string, @Body() dto: UpdateNamedReferenceDto) { return this.service.update('allergen', id, dto); }
}

@Controller('dietary-tags')
export class DietaryTagsController {
  constructor(private readonly service: ReferenceDataService) {}
  @Get() @RequirePermissions('catalogue.read') list() { return this.service.list('dietaryTag'); }
  @Post() @RequirePermissions('catalogue.manage') create(@Body() dto: CreateNamedReferenceDto) { return this.service.create('dietaryTag', dto); }
  @Patch(':id') @RequirePermissions('catalogue.manage') update(@Param('id') id: string, @Body() dto: UpdateNamedReferenceDto) { return this.service.update('dietaryTag', id, dto); }
}

@Controller('kitchen-stations')
export class KitchenStationsController {
  constructor(private readonly service: ReferenceDataService) {}
  @Get() @RequirePermissions('catalogue.read') list() { return this.service.list('kitchenStation'); }
  @Post() @RequirePermissions('catalogue.manage') create(@Body() dto: CreateOrderedReferenceDto) { return this.service.create('kitchenStation', dto); }
  @Patch(':id') @RequirePermissions('catalogue.manage') update(@Param('id') id: string, @Body() dto: UpdateOrderedReferenceDto) { return this.service.update('kitchenStation', id, dto); }
}

@Controller('portion-sizes')
export class PortionSizesController {
  constructor(private readonly service: ReferenceDataService) {}
  @Get() @RequirePermissions('catalogue.read') list() { return this.service.list('portionSize'); }
  @Post() @RequirePermissions('catalogue.manage') create(@Body() dto: CreateOrderedReferenceDto) { return this.service.create('portionSize', dto); }
  @Patch(':id') @RequirePermissions('catalogue.manage') update(@Param('id') id: string, @Body() dto: UpdateOrderedReferenceDto) { return this.service.update('portionSize', id, dto); }
}

@Controller('packaging-types')
export class PackagingTypesController {
  constructor(private readonly service: ReferenceDataService) {}
  @Get() @RequirePermissions('catalogue.read') list() { return this.service.list('packagingType'); }
  @Post() @RequirePermissions('catalogue.manage') create(@Body() dto: CreateOrderedReferenceDto) { return this.service.create('packagingType', dto); }
  @Patch(':id') @RequirePermissions('catalogue.manage') update(@Param('id') id: string, @Body() dto: UpdateOrderedReferenceDto) { return this.service.update('packagingType', id, dto); }
}
