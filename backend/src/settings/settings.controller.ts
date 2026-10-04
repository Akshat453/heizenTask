import { Body, Controller, Delete, Get, Post, Put } from '@nestjs/common';
import { IdParam } from '../common/decorators/id-param.decorator.js';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator.js';
import { SettingsService } from './settings.service.js';
import {
  CreateKitchenHolidayDto,
  UpdatePlatformSettingsDto,
  UpsertKitchenWorkingDaysDto,
} from './dto/settings.dto.js';

@Controller('settings')
export class SettingsController {
  constructor(private readonly service: SettingsService) {}

  @Get()
  @RequirePermissions('settings.read')
  get() {
    return this.service.getSettings();
  }

  @Put()
  @RequirePermissions('settings.manage')
  update(@Body() dto: UpdatePlatformSettingsDto) {
    return this.service.updateSettings(dto);
  }

  @Put('working-days')
  @RequirePermissions('settings.manage')
  upsertWorkingDays(@Body() dto: UpsertKitchenWorkingDaysDto) {
    return this.service.upsertWorkingDays(dto);
  }

  @Get('holidays')
  @RequirePermissions('settings.read')
  listHolidays() {
    return this.service.listHolidays();
  }

  @Post('holidays')
  @RequirePermissions('settings.manage')
  createHoliday(@Body() dto: CreateKitchenHolidayDto) {
    return this.service.createHoliday(dto);
  }

  @Delete('holidays/:id')
  @RequirePermissions('settings.manage')
  deleteHoliday(@IdParam() id: string) {
    return this.service.deleteHoliday(id);
  }
}
