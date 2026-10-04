"use client";

import { ErrorState } from "@/components/app/error-state";
import { KpiGrid } from "@/components/app/kpi-grid";
import { KpiTile } from "@/components/app/kpi-tile";
import { Panel } from "@/components/app/panel";
import { useAuth } from "@/components/auth/auth-provider";
import { DateTimeText } from "@/components/app/date-time-text";
import { useBusinessClock } from "@/hooks/use-business-clock";
import { DEFINITIONS } from "@/lib/dashboard-definitions";
import { formatCount, formatMoney } from "@/lib/format";
import { DASHBOARD_PERMISSIONS, P } from "@/lib/permissions";
import { AdminAttention } from "./admin-attention";
import { CutoffBanner } from "./cutoff-banner";
import { DashboardHeader } from "./dashboard-header";
import { DashboardGrid, DashboardPage } from "./dashboard-layout";
import { MetricList } from "./metric-list";
import { useAdminDashboard, useDispatchDashboard, useKitchenDashboard } from "./queries";
import { useCutoffWindow } from "./use-cutoff-window";

const D = DEFINITIONS;

/** "Is today on track, and what needs me?" */
export function AdminDashboard() {
  const { can } = useAuth();
  const { businessDate } = useBusinessClock();
  const admin = useAdminDashboard();
  const kitchen = useKitchenDashboard(DASHBOARD_PERMISSIONS.kitchen.every(can));
  const dispatch = useDispatchDashboard(DASHBOARD_PERMISSIONS.dispatch.every(can));
  const cutoff = useCutoffWindow(businessDate, can(P.settingsRead));
  const m = admin.data?.metrics;
  const loading = admin.isLoading;

  const refresh = () => {
    void admin.refetch();
    void kitchen.refetch();
    void dispatch.refetch();
    void cutoff.refetch();
  };

  return (
    <DashboardPage>
      <DashboardHeader
        businessDate={admin.data?.businessDate}
        updatedAt={admin.dataUpdatedAt}
        onRefresh={refresh}
        refreshing={admin.isFetching}
      />
      <CutoffBanner window={cutoff.data} loading={cutoff.isLoading} />

      {admin.error ? (
        <ErrorState error={admin.error} title="Could not load the admin dashboard" onRetry={() => admin.refetch()} isRetrying={admin.isFetching} />
      ) : (
        <KpiGrid>
          <KpiTile label="Today's orders" value={m ? formatCount(m.todayOrders) : null} sub="excluding cancelled and rejected" definition={D.admin.todayOrders} loading={loading} />
          <KpiTile label="Today's billable" value={m ? formatMoney(m.todayBillableCents) : null} sub="frozen at cut-off" definition={D.admin.todayBillable} href="/billing" loading={loading} />
          <KpiTile
            label="Late kitchen work"
            value={m ? formatCount(m.lateKitchenOrders) : null}
            sub={m ? `${formatCount(m.latePrepUnits)} unfinished prep units` : undefined}
            definition={D.admin.lateKitchen}
            href="/kitchen"
            loading={loading}
          />
          <KpiTile label="Active deliveries" value={m ? formatCount(m.activeDeliveries) : null} sub="ready to leave or out" definition={D.admin.activeDeliveries} href="/dispatch" loading={loading} />
          <KpiTile label="Not invoiced" value={m ? formatMoney(m.uninvoicedCents) : null} sub="all delivery dates" definition={D.admin.uninvoiced} href="/billing" loading={loading} />
        </KpiGrid>
      )}

      <DashboardGrid
        main={<AdminAttention data={admin.data} cutoffWindow={cutoff.data} loading={loading} />}
        rail={
          <>
            {kitchen.data || kitchen.isLoading ? (
              <Panel title="Kitchen right now" description="Prep units for today's confirmed orders">
                <MetricList
                  loading={kitchen.isLoading}
                  rows={[
                    { label: "Late", value: kitchen.data?.metrics.late ?? 0, definition: D.kitchen.late, tone: "danger", href: "/kitchen" },
                    { label: "At risk", value: kitchen.data?.metrics.atRisk ?? 0, definition: D.kitchen.atRisk, tone: "warning", href: "/kitchen" },
                    { label: "In progress", value: kitchen.data?.metrics.started ?? 0, definition: D.kitchen.started },
                    { label: "Not started", value: kitchen.data?.metrics.notStarted ?? 0, definition: D.kitchen.notStarted },
                  ]}
                />
                {kitchen.data?.metrics.nextDeadline && (
                  <p className="mt-3 border-t pt-3 text-xs text-muted-foreground">
                    Next deadline <DateTimeText value={kitchen.data.metrics.nextDeadline.plannedKitchenReadyAt} mode="time" className="text-foreground" /> ·{" "}
                    <span className="num">{kitchen.data.metrics.nextDeadline.orderNumber}</span> for {kitchen.data.metrics.nextDeadline.companyName}
                  </p>
                )}
              </Panel>
            ) : null}
            {dispatch.data || dispatch.isLoading ? (
              <Panel title="Dispatch right now" description="Today's drops">
                <MetricList
                  loading={dispatch.isLoading}
                  rows={[
                    { label: "Running late", value: dispatch.data?.metrics.lateDeliveries ?? 0, definition: D.dispatch.lateDeliveries, tone: "danger", href: "/dispatch" },
                    { label: "Ready, no driver", value: dispatch.data?.metrics.unassigned ?? 0, definition: D.dispatch.unassigned, tone: "warning", href: "/dispatch" },
                    { label: "Ready to leave", value: dispatch.data?.metrics.dispatchReady ?? 0, definition: D.dispatch.dispatchReady },
                    { label: "Out for delivery", value: dispatch.data?.metrics.outForDelivery ?? 0, definition: D.dispatch.outForDelivery },
                  ]}
                />
              </Panel>
            ) : null}
          </>
        }
      />
    </DashboardPage>
  );
}
