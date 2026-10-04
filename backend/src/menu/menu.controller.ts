import { Body, Controller, Get, Patch, Post, Put, Query } from '@nestjs/common';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto.js';
import { IdParam } from '../common/decorators/id-param.decorator.js';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator.js';
import {
  CreateMenuCategoryDto,
  ReplaceMenuItemsDto,
  UpdateMenuCategoryDto,
} from './dto/menu.dto.js';
import { MenuService } from './menu.service.js';

@Controller('menu/categories')
export class MenuController {
  constructor(private readonly service: MenuService) {}
  @Get() @RequirePermissions('catalogue.read') list(
    @Query() query: PaginationQueryDto,
  ) {
    return this.service.listCategories(query);
  }
  @Post() @RequirePermissions('catalogue.manage') create(
    @Body() dto: CreateMenuCategoryDto,
  ) {
    return this.service.createCategory(dto);
  }
  @Get(':id') @RequirePermissions('catalogue.read') get(@IdParam() id: string) {
    return this.service.getCategory(id);
  }
  @Patch(':id') @RequirePermissions('catalogue.manage') update(
    @IdParam() id: string,
    @Body() dto: UpdateMenuCategoryDto,
  ) {
    return this.service.updateCategory(id, dto);
  }
  @Put(':id/items') @RequirePermissions('catalogue.manage') items(
    @IdParam() id: string,
    @Body() dto: ReplaceMenuItemsDto,
  ) {
    return this.service.replaceItems(id, dto);
  }
}
