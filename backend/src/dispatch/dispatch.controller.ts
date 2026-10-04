import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { IdParam } from '../common/decorators/id-param.decorator.js';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator.js';
import { DispatchQueryDto, AssignDriverDto } from './dto/dispatch.dto.js';
import { DispatchQueryService } from './services/dispatch-query.service.js';
import { DispatchLifecycleService } from './services/dispatch-lifecycle.service.js';
import { DeliveryGroupingService } from './services/delivery-grouping.service.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';

@Controller('dispatch/drops')
export class DispatchController {
  constructor(
    private readonly queryService: DispatchQueryService,
    private readonly lifecycleService: DispatchLifecycleService,
    private readonly groupingService: DeliveryGroupingService,
  ) {}

  @RequirePermissions('dispatch.read')
  @Get()
  async list(@Query() query: DispatchQueryDto) {
    return this.queryService.list(query);
  }

  @RequirePermissions('dispatch.update')
  @Post('reconcile')
  async reconcile() {
    return this.groupingService.reconcileAll();
  }

  @RequirePermissions('dispatch.assign_driver')
  @Post(':id/assign-driver')
  async assignDriver(
    @IdParam() id: string,
    @Body() dto: AssignDriverDto,
    @CurrentUser('id') actorId: string,
  ) {
    return this.lifecycleService.assignDriver(id, dto.driverId, actorId);
  }

  @RequirePermissions('dispatch.update')
  @Post(':id/out-for-delivery')
  async outForDelivery(
    @IdParam() id: string,
    @CurrentUser('id') actorId: string,
  ) {
    return this.lifecycleService.outForDelivery(id, actorId);
  }

  @RequirePermissions('dispatch.read')
  @Get(':id/proof-url')
  async getProofUrl(@IdParam() id: string) {
    return this.queryService.getProofUrl(id);
  }
}
