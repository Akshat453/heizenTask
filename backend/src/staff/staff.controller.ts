import { Body, Controller, Get, Patch, Post, Query } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { IdParam } from '../common/decorators/id-param.decorator.js';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator.js';
import {
  CreateStaffDto,
  StaffQueryDto,
  UpdateStaffDto,
} from './dto/staff.dto.js';
import { StaffManagementService } from './staff-management.service.js';

@Controller('staff')
export class StaffController {
  constructor(private readonly service: StaffManagementService) {}

  /** Active staff who can be assigned to a drop (by driver.own_drops.deliver permission). */
  @Get('drivers')
  @RequirePermissions('dispatch.assign_driver')
  listDrivers() {
    return this.service.listDrivers();
  }

  @Get()
  @RequirePermissions('staff.manage')
  list(@Query() query: StaffQueryDto) {
    return this.service.list(query);
  }

  @Post()
  @RequirePermissions('staff.manage')
  create(@Body() dto: CreateStaffDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @RequirePermissions('staff.manage')
  update(
    @IdParam() id: string,
    @Body() dto: UpdateStaffDto,
    @CurrentUser('id') actorId: string,
  ) {
    return this.service.update(id, dto, actorId);
  }
}

@Controller('roles')
export class RolesController {
  constructor(private readonly service: StaffManagementService) {}

  @Get()
  @RequirePermissions('staff.manage')
  list() {
    return this.service.listRoles();
  }
}
