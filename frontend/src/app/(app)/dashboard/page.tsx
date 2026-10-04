"use client";

import { LayoutDashboard } from "lucide-react";
import { EmptyState } from "@/components/app/empty-state";
import { useAuth } from "@/components/auth/auth-provider";
import { AdminDashboard } from "@/components/dashboard/admin-dashboard";
import { DispatchDashboard } from "@/components/dashboard/dispatch-dashboard";
import { DriverDashboard } from "@/components/dashboard/driver-dashboard";
import { KitchenDashboard } from "@/components/dashboard/kitchen-dashboard";

/**
 * The role name only chooses which dashboard to render (presentation). Every
 * dashboard endpoint is still permission-checked by the API.
 */
const DASHBOARDS: Record<string, () => React.JSX.Element> = {
  ADMIN: AdminDashboard,
  KITCHEN: KitchenDashboard,
  DISPATCH: DispatchDashboard,
  DRIVER: DriverDashboard,
};

export default function DashboardPage() {
  const { user } = useAuth();
  const Dashboard = user ? DASHBOARDS[user.role] : undefined;
  if (Dashboard) return <Dashboard />;
  return (
    <main className="p-4 md:p-6">
      <EmptyState
        icon={LayoutDashboard}
        title="No dashboard for this role yet"
        description="Use the navigation to open the pages your role can access."
      />
    </main>
  );
}
