import { Module } from '@nestjs/common';
import { PriceResolverService } from './price-resolver.service.js';
import {
  ItemPricesController,
  PricingController,
} from './pricing.controller.js';
import { PricingService } from './pricing.service.js';

@Module({
  controllers: [PricingController, ItemPricesController],
  providers: [PricingService, PriceResolverService],
  exports: [PricingService, PriceResolverService],
})
export class PricingModule {}
