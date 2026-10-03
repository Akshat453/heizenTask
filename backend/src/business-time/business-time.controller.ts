import { Controller, Get, Param } from '@nestjs/common';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator.js';
import { BusinessTimeService } from './business-time.service.js';

@Controller('business-time')
export class BusinessTimeController {
  constructor(private readonly service: BusinessTimeService) {}

  /** GET /business-time/cutoff/:date — get cutoff info for a delivery date (YYYY-MM-DD) */
  @Get('cutoff/:date')
  @RequirePermissions('settings.read')
  getCutoff(@Param('date') date: string) {
    return this.service.getCutoffForDeliveryDate(date);
  }
}
