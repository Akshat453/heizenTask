import {
  Controller,
  Get,
  Post,
  Body,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { IdParam } from '../common/decorators/id-param.decorator.js';
import { FileInterceptor } from '@nestjs/platform-express';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { DriverQueryService } from './services/driver-query.service.js';
import type { UploadedPhoto } from './services/delivery-proof.service.js';
import { MAX_DELIVERY_PHOTO_BYTES } from './delivery-photo.js';
import { DriverLifecycleService } from './services/driver-lifecycle.service.js';

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
  @UseInterceptors(
    FileInterceptor('photo', {
      limits: { fileSize: MAX_DELIVERY_PHOTO_BYTES, files: 1 },
    }),
  )
  async deliver(
    @IdParam() dropId: string,
    @Body('note') note: string | undefined,
    @UploadedFile() photo: UploadedPhoto | undefined,
    @CurrentUser('id') driverId: string,
  ) {
    return this.lifecycleService.markDelivered(dropId, driverId, note, photo);
  }
}
