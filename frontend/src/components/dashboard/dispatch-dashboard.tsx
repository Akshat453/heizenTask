"use client";

import { Truck } from "lucide-react";
import Link from "next/link";
import { ErrorState } from "@/components/app/error-state";
import { KpiGrid } from "@/components/app/kpi-grid";
import { KpiTile } from "@/components/app/kpi-tile";
import { Button } from "@/components/ui/button";
import { DEFINITIONS } from "@/lib/dashboard-definitions";
import { formatCount } from "@/lib/format";
import { DashboardHeader } from "./dashboard-header";
import { DashboardGrid, DashboardPage } from "./dashboard-layout";
import { DriverLoadPanel, NextDeliveriesPanel, UnassignedDropsPanel } from "./dispatch-panels";
import { useDispatchDashboard, useTodayDrops } from "./queries";

const D = DEFINITIONS.dispatch;

/** "What leaves next, and who takes it?" */
export function DispatchDashboard() {
  const dashboard = useDispatchDashboard();
  const today = dashboard.data?.businessDate;
  const drops = useTodayDrops(today);
  const m = dashboard.data?.metrics;
  const loading = dashboard.isLoading;
  const dropsProps = {
    drops: drops.data?.data,
    loading: drops.isLoading || !today,
    error: drops.error,
    onRetry: () => void drops.refetch(),
    truncated: (drops.data?.pagination.totalItems ?? 0) > (drops.data?.data.length ?? 0),
  };

  return (
    <DashboardPage>
      <DashboardHeader
        businessDate={today}
        updatedAt={dashboard.dataUpdatedAt}
        onRefresh={() => {
          void dashboard.refetch();
          void drops.refetch();
        }}
        refreshing={dashboard.isFetching || drops.isFetching}
      />
      <Button className="w-full sm:w-fit" render={<Link href="/dispatch" />} nativeButton={false}>
        <Truck data-icon="inline-start" />
        Open dispatch board
      </Button>

      {dashboard.error ? (
        <ErrorState error={dashboard.error} title="Could not load the dispatch dashboard" onRetry={() => dashboard.refetch()} />
      ) : (
        <KpiGrid>
          <KpiTile label="Ready to leave" value={m ? formatCount(m.dispatchReady) : null} sub="with or without a driver" definition={D.dispatchReady} href="/dispatch" loading={loading} />
          <KpiTile label="Ready, no driver" value={m ? formatCount(m.unassigned) : null} sub="needs assigning" definition={D.unassigned} href="/dispatch" loading={loading} />
          <KpiTile label="Out for delivery" value={m ? formatCount(m.outForDelivery) : null} sub="on the road" definition={D.outForDelivery} href="/dispatch" loading={loading} />
          <KpiTile label="Running late" value={m ? formatCount(m.lateDeliveries) : null} sub="past delivery time, not delivered" definition={D.lateDeliveries} href="/dispatch" loading={loading} />
        </KpiGrid>
      )}

      <DashboardGrid
        main={
          <>
            <UnassignedDropsPanel {...dropsProps} />
            <NextDeliveriesPanel {...dropsProps} />
          </>
        }
        rail={<DriverLoadPanel {...dropsProps} />}
      />
    </DashboardPage>
  );
}
