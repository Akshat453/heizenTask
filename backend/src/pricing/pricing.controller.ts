import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator.js';
import { CreatePriceTierDto, UpdatePriceTierDto, UpdateTierPricesDto } from './dto/pricing.dto.js';
import { PricingService } from './pricing.service.js';

@Controller('price-tiers')
export class PricingController {
  constructor(private readonly service: PricingService) {}
  @Get() @RequirePermissions('pricing.read') list() { return this.service.listTiers(); }
  @Post() @RequirePermissions('pricing.manage') create(@Body() dto: CreatePriceTierDto) { return this.service.createTier(dto); }
  @Get(':id') @RequirePermissions('pricing.read') get(@Param('id') id: string) { return this.service.getTier(id); }
  @Patch(':id') @RequirePermissions('pricing.manage') update(@Param('id') id: string, @Body() dto: UpdatePriceTierDto) { return this.service.updateTier(id, dto); }
  @Get(':id/editor') @RequirePermissions('pricing.read') editor(@Param('id') id: string) { return this.service.editor(id); }
  @Patch(':id/prices') @RequirePermissions('pricing.manage') prices(@Param('id') id: string, @Body() dto: UpdateTierPricesDto) { return this.service.updatePrices(id, dto); }
}
