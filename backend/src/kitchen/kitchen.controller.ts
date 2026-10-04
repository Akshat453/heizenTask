import { Controller, Get, Post, Query } from '@nestjs/common';
import { IdParam } from '../common/decorators/id-param.decorator.js';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { KitchenQueryDto } from './dto/kitchen.dto.js';
import { KitchenQueryService } from './services/kitchen-query.service.js';
import { KitchenLifecycleService } from './services/kitchen-lifecycle.service.js';

@Controller('kitchen')
export class KitchenController {
  constructor(
    private readonly queryService: KitchenQueryService,
    private readonly lifecycleService: KitchenLifecycleService,
  ) {}

  @RequirePermissions('kitchen.read')
  @Get()
  async getKitchenBoard(@Query() query: KitchenQueryDto) {
    return this.queryService.getKitchenBoard(query.date, query.stationId);
  }

  @RequirePermissions('kitchen.update')
  @Post('prep-units/:id/start')
  async startPrepUnit(
    @IdParam() prepUnitId: string,
    @CurrentUser('id') staffUserId: string,
  ) {
    return this.lifecycleService.startPrepUnit(prepUnitId, staffUserId);
  }

  @RequirePermissions('kitchen.update')
  @Post('prep-units/:id/done')
  async completePrepUnit(
    @IdParam() prepUnitId: string,
    @CurrentUser('id') staffUserId: string,
  ) {
    return this.lifecycleService.completePrepUnit(prepUnitId, staffUserId);
  }

  @RequirePermissions('kitchen.force_complete')
  @Post('orders/:id/force-complete')
  async forceCompleteOrder(
    @IdParam() orderId: string,
    @CurrentUser('id') staffUserId: string,
  ) {
    return this.lifecycleService.forceCompleteOrder(orderId, staffUserId);
  }
}
