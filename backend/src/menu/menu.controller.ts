import { Body, Controller, Get, Patch, Post, Put, Query } from '@nestjs/common';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto.js';
import { IdParam } from '../common/decorators/id-param.decorator.js';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator.js';
import {
  CreateMenuCategoryDto,
  ReplaceHiddenCompaniesDto,
  ReplaceMenuItemsDto,
  UpdateMenuCategoryDto,
} from './dto/menu.dto.js';
import { MenuHidingService } from './menu-hiding.service.js';
import { MenuService } from './menu.service.js';

@Controller('menu/categories')
export class MenuController {
  constructor(
    private readonly service: MenuService,
    private readonly hiding: MenuHidingService,
  ) {}
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
  /** Replaces the set of companies hiding this category. */
  @Put(':id/hidden-companies') @RequirePermissions('catalogue.manage') hide(
    @IdParam() id: string,
    @Body() dto: ReplaceHiddenCompaniesDto,
  ) {
    return this.hiding.replaceCategoryHiding(id, dto.companyIds);
  }
}

@Controller('menu/dishes')
export class MenuDishesController {
  constructor(private readonly hiding: MenuHidingService) {}
  /** Replaces the set of companies hiding this dish (on every menu). */
  @Put(':id/hidden-companies') @RequirePermissions('catalogue.manage') hide(
    @IdParam() id: string,
    @Body() dto: ReplaceHiddenCompaniesDto,
  ) {
    return this.hiding.replaceDishHiding(id, dto.companyIds);
  }
}
