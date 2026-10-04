/**
 * Permission keys exactly as seeded by the backend (backend/prisma/seed.ts).
 * Gate UI with `can(P.ordersRead)`; the server still enforces every permission.
 */
export const P = {
  catalogueRead: "catalogue.read",
  catalogueManage: "catalogue.manage",
  pricingRead: "pricing.read",
  pricingManage: "pricing.manage",
  companiesRead: "companies.read",
  companiesManage: "companies.manage",
  employeesRead: "employees.read",
  employeesManage: "employees.manage",
  ordersRead: "orders.read",
  ordersCreate: "orders.create",
  ordersEdit: "orders.edit",
  ordersOverride: "orders.override",
  kitchenRead: "kitchen.read",
  kitchenUpdate: "kitchen.update",
  kitchenForceComplete: "kitchen.force_complete",
  dispatchRead: "dispatch.read",
  dispatchUpdate: "dispatch.update",
  dispatchAssignDriver: "dispatch.assign_driver",
  driverOwnDropsRead: "driver.own_drops.read",
  driverOwnDropsDeliver: "driver.own_drops.deliver",
  billingRead: "billing.read",
  billingManage: "billing.manage",
  settingsRead: "settings.read",
  settingsManage: "settings.manage",
  dashboardsRead: "dashboards.read",
} as const;

export type Permission = (typeof P)[keyof typeof P];

/** Permission sets required by each dashboard endpoint (see docs/API_MAP.md). */
export const DASHBOARD_PERMISSIONS = {
  admin: [P.dashboardsRead, P.billingRead, P.ordersRead, P.kitchenRead, P.dispatchRead],
  kitchen: [P.dashboardsRead, P.kitchenRead],
  dispatch: [P.dashboardsRead, P.dispatchRead],
  driver: [P.driverOwnDropsRead],
} as const satisfies Record<string, readonly Permission[]>;
