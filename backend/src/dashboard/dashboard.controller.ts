import { Controller, Get } from '@nestjs/common';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';

import { AdminDashboardService } from './services/admin-dashboard.service.js';
import { KitchenDashboardService } from './services/kitchen-dashboard.service.js';
import { DispatchDashboardService } from './services/dispatch-dashboard.service.js';
import { DriverDashboardService } from './services/driver-dashboard.service.js';

@Controller('dashboard')
export class DashboardController {
  constructor(
    private readonly adminDashboardService: AdminDashboardService,
    private readonly kitchenDashboardService: KitchenDashboardService,
    private readonly dispatchDashboardService: DispatchDashboardService,
    private readonly driverDashboardService: DriverDashboardService,
  ) {}

  @Get('admin')
  @RequirePermissions(
    'dashboards.read',
    'billing.read',
    'orders.read',
    'kitchen.read',
    'dispatch.read',
  )
  getAdminDashboard() {
    return this.adminDashboardService.getAdminDashboard();
  }

  @Get('kitchen')
  @RequirePermissions('dashboards.read', 'kitchen.read')
  getKitchenDashboard() {
    return this.kitchenDashboardService.getKitchenDashboard();
  }

  @Get('dispatch')
  @RequirePermissions('dashboards.read', 'dispatch.read')
  getDispatchDashboard() {
    return this.dispatchDashboardService.getDispatchDashboard();
  }

  @Get('driver')
  @RequirePermissions('driver.own_drops.read')
  getDriverDashboard(@CurrentUser('id') driverId: string) {
    return this.driverDashboardService.getDriverDashboard(driverId);
  }
}
