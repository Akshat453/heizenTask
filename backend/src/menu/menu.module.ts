import { Module } from '@nestjs/common';
import { PricingModule } from '../pricing/pricing.module.js';
import { MenuController, MenuDishesController } from './menu.controller.js';
import { MenuHidingService } from './menu-hiding.service.js';
import { MenuService } from './menu.service.js';
import { OrderabilityService } from './orderability.service.js';

@Module({
  imports: [PricingModule],
  controllers: [MenuController, MenuDishesController],
  providers: [MenuService, MenuHidingService, OrderabilityService],
  exports: [MenuService, OrderabilityService],
})
export class MenuModule {}
