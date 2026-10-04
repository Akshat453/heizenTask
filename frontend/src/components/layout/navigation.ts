import {
  BadgeIndianRupee,
  Building2,
  ChefHat,
  ClipboardList,
  LayoutDashboard,
  Layers,
  ListTree,
  Route,
  Settings,
  Tags,
  Truck,
  UserCog,
  Users,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";
import { DASHBOARD_PERMISSIONS, P, type Permission } from "@/lib/permissions";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Visible when the user has ALL permissions of ANY one set. */
  anyOf: readonly (readonly Permission[])[];
  /**
   * False while the page is not built yet: the item stays out of the sidebar
   * and command palette so reviewers never hit a dead link.
   */
  available: boolean;
};

export type NavGroup = { label: string; items: NavItem[] };

export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Operations",
    items: [
      {
        label: "Dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
        anyOf: Object.values(DASHBOARD_PERMISSIONS),
        available: true,
      },
      { label: "Orders", href: "/orders", icon: ClipboardList, anyOf: [[P.ordersRead]], available: true },
      { label: "Kitchen board", href: "/kitchen", icon: ChefHat, anyOf: [[P.kitchenRead]], available: true },
      { label: "Dispatch", href: "/dispatch", icon: Truck, anyOf: [[P.dispatchRead]], available: true },
      { label: "My route", href: "/driver", icon: Route, anyOf: [[P.driverOwnDropsRead]], available: true },
    ],
  },
  {
    label: "Menu & pricing",
    items: [
      { label: "Dishes & options", href: "/catalogue", icon: UtensilsCrossed, anyOf: [[P.catalogueRead]], available: true },
      { label: "Menu", href: "/menu", icon: ListTree, anyOf: [[P.catalogueRead]], available: true },
      { label: "Pricing tiers", href: "/pricing", icon: Layers, anyOf: [[P.pricingRead]], available: true },
      { label: "Reference data", href: "/reference-data", icon: Tags, anyOf: [[P.catalogueRead]], available: true },
    ],
  },
  {
    label: "Customers",
    items: [
      { label: "Companies", href: "/companies", icon: Building2, anyOf: [[P.companiesRead]], available: true },
      { label: "Employees", href: "/employees", icon: Users, anyOf: [[P.employeesRead]], available: true },
    ],
  },
  {
    label: "Finance",
    items: [{ label: "Billing", href: "/billing", icon: BadgeIndianRupee, anyOf: [[P.billingRead]], available: true }],
  },
  {
    label: "Admin",
    items: [
      // No staff routes or staff permission exist in the API yet (backend gap).
      { label: "Staff", href: "/staff", icon: UserCog, anyOf: [], available: false },
      { label: "Settings", href: "/settings", icon: Settings, anyOf: [[P.settingsRead]], available: true },
    ],
  },
];

export function isNavItemAllowed(item: NavItem, can: (permission: string) => boolean): boolean {
  return item.anyOf.some((set) => set.every(can));
}

/** Groups with only the items this user may open; empty groups are dropped. */
export function visibleNavGroups(can: (permission: string) => boolean): NavGroup[] {
  return NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => item.available && isNavItemAllowed(item, can)),
  })).filter((group) => group.items.length > 0);
}

/** The nav item that owns a pathname (longest matching prefix), if any. */
export function navItemForPath(pathname: string): NavItem | undefined {
  return NAV_GROUPS.flatMap((g) => g.items)
    .filter((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0];
}

export function isNavItemActive(item: NavItem, pathname: string): boolean {
  return navItemForPath(pathname)?.href === item.href;
}

/** Routes a phone-only role needs. A user whose permitted pages are all here gets the minimal driver shell. */
const PHONE_ROUTES = new Set(["/dashboard", "/driver"]);

export function isPhoneOnlyUser(can: (permission: string) => boolean): boolean {
  const hrefs = visibleNavGroups(can).flatMap((g) => g.items.map((i) => i.href));
  return hrefs.length > 0 && hrefs.every((href) => PHONE_ROUTES.has(href));
}
