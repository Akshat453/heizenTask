import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import {
  CreateOrderDto,
  UpdateOrderDto,
  OrderQueryDto,
  OverrideDeliveryDetailsDto,
  RejectOrderDto,
  ProcessCutoffDto,
} from './dto/order.dto.js';
import { OrderQueryService } from './services/order-query.service.js';
import { OrderCreationService } from './services/order-creation.service.js';
import { OrderLifecycleService } from './services/order-lifecycle.service.js';
import { CutoffService } from './services/cutoff.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../common/guards/permissions.guard.js';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('orders')
export class OrdersController {
  constructor(
    private readonly queryService: OrderQueryService,
    private readonly creationService: OrderCreationService,
    private readonly lifecycleService: OrderLifecycleService,
    private readonly cutoffService: CutoffService,
  ) {}

  @RequirePermissions('orders.read')
  @Get()
  async listOrders(@Query() query: OrderQueryDto) {
    return this.queryService.list(query);
  }

  @RequirePermissions('orders.read')
  @Get(':id')
  async getOrder(@Param('id') id: string) {
    return this.queryService.get(id);
  }

  @RequirePermissions('orders.create')
  @Post()
  async createOrder(
    @Body() dto: CreateOrderDto,
    @CurrentUser('id') staffUserId: string,
  ) {
    return this.creationService.create(dto, staffUserId);
  }

  @RequirePermissions('orders.edit')
  @Patch(':id')
  async updateOrder(
    @Param('id') id: string,
    @Body() dto: UpdateOrderDto,
    @CurrentUser('id') staffUserId: string,
  ) {
    return this.creationService.update(id, dto, staffUserId);
  }

  @RequirePermissions('orders.edit')
  @Post(':id/place')
  async placeOrder(
    @Param('id') id: string,
    @CurrentUser('id') staffUserId: string,
  ) {
    return this.lifecycleService.place(id, staffUserId);
  }

  @RequirePermissions('orders.edit')
  @Post(':id/cancel')
  async cancelOrder(
    @Param('id') id: string,
    @CurrentUser('id') staffUserId: string,
  ) {
    return this.lifecycleService.cancel(id, staffUserId);
  }

  @RequirePermissions('orders.override')
  @Post(':id/reject')
  async rejectOrder(
    @Param('id') id: string,
    @Body() dto: RejectOrderDto,
    @CurrentUser('id') staffUserId: string,
  ) {
    return this.lifecycleService.reject(id, dto, staffUserId);
  }

  @RequirePermissions('orders.override')
  @Patch(':id/delivery-details')
  async overrideDeliveryDetails(
    @Param('id') id: string,
    @Body() dto: OverrideDeliveryDetailsDto,
    @CurrentUser('id') staffUserId: string,
  ) {
    return this.lifecycleService.overrideDelivery(id, dto, staffUserId);
  }

  @RequirePermissions('orders.override')
  @Post('cutoff/process')
  async processCutoff(
    @Body() dto: ProcessCutoffDto,
    @CurrentUser('id') staffUserId: string,
  ) {
    return this.cutoffService.processManual(dto, staffUserId);
  }
}
