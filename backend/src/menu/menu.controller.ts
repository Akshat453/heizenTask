import { Body, Controller, Get, Param, Patch, Post, Put } from '@nestjs/common';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator.js';
import { CreateMenuCategoryDto, ReplaceMenuItemsDto, UpdateMenuCategoryDto } from './dto/menu.dto.js';
import { MenuService } from './menu.service.js';

@Controller('menu/categories')
export class MenuController {
  constructor(private readonly service: MenuService) {}
  @Get() @RequirePermissions('catalogue.read') list() { return this.service.listCategories(); }
  @Post() @RequirePermissions('catalogue.manage') create(@Body() dto: CreateMenuCategoryDto) { return this.service.createCategory(dto); }
  @Get(':id') @RequirePermissions('catalogue.read') get(@Param('id') id: string) { return this.service.getCategory(id); }
  @Patch(':id') @RequirePermissions('catalogue.manage') update(@Param('id') id: string, @Body() dto: UpdateMenuCategoryDto) { return this.service.updateCategory(id, dto); }
  @Put(':id/items') @RequirePermissions('catalogue.manage') items(@Param('id') id: string, @Body() dto: ReplaceMenuItemsDto) { return this.service.replaceItems(id, dto); }
}
