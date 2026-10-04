import { Module } from '@nestjs/common';
import { PricingModule } from '../pricing/pricing.module.js';
import { MenuController } from './menu.controller.js';
import { MenuService } from './menu.service.js';
import { OrderabilityService } from './orderability.service.js';

@Module({
  imports: [PricingModule],
  controllers: [MenuController],
  providers: [MenuService, OrderabilityService],
  exports: [MenuService, OrderabilityService],
})
export class MenuModule {}
