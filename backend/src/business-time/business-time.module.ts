import { Module } from '@nestjs/common';
import { SettingsModule } from '../settings/settings.module.js';
import { BusinessTimeController } from './business-time.controller.js';
import { BusinessTimeService } from './business-time.service.js';

@Module({
  imports: [SettingsModule],
  controllers: [BusinessTimeController],
  providers: [BusinessTimeService],
  exports: [BusinessTimeService],
})
export class BusinessTimeModule {}
