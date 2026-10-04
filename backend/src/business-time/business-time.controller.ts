import { BadRequestException, Controller, Get, Param } from '@nestjs/common';
import { isIsoDate } from './business-time.utils.js';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator.js';
import { BusinessTimeService } from './business-time.service.js';

@Controller('business-time')
export class BusinessTimeController {
  constructor(private readonly service: BusinessTimeService) {}

  /** GET /business-time/now — any signed-in staff member; exposes only date, timezone and server time. */
  @Get('now')
  getNow() {
    return this.service.getClock();
  }

  /** GET /business-time/cutoff/:date — get cutoff info for a delivery date (YYYY-MM-DD) */
  @Get('cutoff/:date')
  @RequirePermissions('settings.read')
  getCutoff(@Param('date') date: string) {
    if (!isIsoDate(date))
      throw new BadRequestException('date must be a YYYY-MM-DD calendar date.');
    return this.service.getCutoffForDeliveryDate(date);
  }
}
