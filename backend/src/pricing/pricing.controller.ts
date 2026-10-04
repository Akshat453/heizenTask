import { Body, Controller, Get, Patch, Post } from '@nestjs/common';
import { IdParam } from '../common/decorators/id-param.decorator.js';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator.js';
import {
  CreatePriceTierDto,
  UpdatePriceTierDto,
  UpdateTierPricesDto,
} from './dto/pricing.dto.js';
import { PricingService } from './pricing.service.js';

@Controller('price-tiers')
export class PricingController {
  constructor(private readonly service: PricingService) {}
  @Get() @RequirePermissions('pricing.read') list() {
    return this.service.listTiers();
  }
  @Post() @RequirePermissions('pricing.manage') create(
    @Body() dto: CreatePriceTierDto,
  ) {
    return this.service.createTier(dto);
  }
  @Get(':id') @RequirePermissions('pricing.read') get(@IdParam() id: string) {
    return this.service.getTier(id);
  }
  @Patch(':id') @RequirePermissions('pricing.manage') update(
    @IdParam() id: string,
    @Body() dto: UpdatePriceTierDto,
  ) {
    return this.service.updateTier(id, dto);
  }
  @Get(':id/editor') @RequirePermissions('pricing.read') editor(
    @IdParam() id: string,
  ) {
    return this.service.editor(id);
  }
  @Patch(':id/prices') @RequirePermissions('pricing.manage') prices(
    @IdParam() id: string,
    @Body() dto: UpdateTierPricesDto,
  ) {
    return this.service.updatePrices(id, dto);
  }
}

/** Effective price of one dish or option on every tier (dish/option editors). */
@Controller()
export class ItemPricesController {
  constructor(private readonly service: PricingService) {}
  @Get('dishes/:id/prices') @RequirePermissions('pricing.read') dishPrices(
    @IdParam() id: string,
  ) {
    return this.service.itemPrices('dish', id);
  }
  @Get('options/:id/prices') @RequirePermissions('pricing.read') optionPrices(
    @IdParam() id: string,
  ) {
    return this.service.itemPrices('option', id);
  }
}
