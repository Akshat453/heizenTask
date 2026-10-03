import { Controller, Get, Post, Param, Body, UseGuards, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../common/guards/permissions.guard.js';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { DriverQueryService } from './services/driver-query.service.js';
import { DriverLifecycleService } from './services/driver-lifecycle.service.js';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('driver/drops')
export class DriverController {
  constructor(
    private readonly queryService: DriverQueryService,
    private readonly lifecycleService: DriverLifecycleService,
  ) {}

  @RequirePermissions('driver.own_drops.read')
  @Get('today')
  async getTodayDrops(@CurrentUser('id') driverId: string) {
    return this.queryService.getTodayDrops(driverId);
  }

  @RequirePermissions('driver.own_drops.deliver')
  @Post(':id/deliver')
  @UseInterceptors(FileInterceptor('photo'))
  async deliver(
    @Param('id') dropId: string,
    @Body('note') note: string,
    @UploadedFile() photo: any,
    @CurrentUser('id') driverId: string,
  ) {
    return this.lifecycleService.markDelivered(dropId, driverId, note, photo);
  }
}
