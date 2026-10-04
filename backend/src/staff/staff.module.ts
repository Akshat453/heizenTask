import { Module } from '@nestjs/common';
import { StaffManagementService } from './staff-management.service.js';
import { RolesController, StaffController } from './staff.controller.js';
import { StaffService } from './staff.service.js';

@Module({
  controllers: [StaffController, RolesController],
  providers: [StaffService, StaffManagementService],
  exports: [StaffService],
})
export class StaffModule {}
