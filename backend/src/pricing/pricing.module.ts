import { Module } from '@nestjs/common';
import { PriceResolverService } from './price-resolver.service.js';
import { PricingController } from './pricing.controller.js';
import { PricingService } from './pricing.service.js';

@Module({ controllers: [PricingController], providers: [PricingService, PriceResolverService], exports: [PricingService, PriceResolverService] })
export class PricingModule {}
