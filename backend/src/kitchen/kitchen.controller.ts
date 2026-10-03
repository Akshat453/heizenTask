import { Controller, Get, Post, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../common/guards/permissions.guard.js';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { KitchenQueryDto } from './dto/kitchen.dto.js';
import { KitchenQueryService } from './services/kitchen-query.service.js';
import { KitchenLifecycleService } from './services/kitchen-lifecycle.service.js';

@UseGuards(JwtAuthGuard, PermissionsGuard)
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
    @Param('id') prepUnitId: string,
    @CurrentUser('id') staffUserId: string,
  ) {
    return this.lifecycleService.startPrepUnit(prepUnitId, staffUserId);
  }

  @RequirePermissions('kitchen.update')
  @Post('prep-units/:id/done')
  async completePrepUnit(
    @Param('id') prepUnitId: string,
    @CurrentUser('id') staffUserId: string,
  ) {
    return this.lifecycleService.completePrepUnit(prepUnitId, staffUserId);
  }

  @RequirePermissions('kitchen.force_complete')
  @Post('orders/:id/force-complete')
  async forceCompleteOrder(
    @Param('id') orderId: string,
    @CurrentUser('id') staffUserId: string,
  ) {
    return this.lifecycleService.forceCompleteOrder(orderId, staffUserId);
  }
}
