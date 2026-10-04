"use client";

import { ChefHat } from "lucide-react";
import Link from "next/link";
import { ErrorState } from "@/components/app/error-state";
import { KpiGrid } from "@/components/app/kpi-grid";
import { KpiTile } from "@/components/app/kpi-tile";
import { Button } from "@/components/ui/button";
import { useBusinessClock } from "@/hooks/use-business-clock";
import { DEFINITIONS } from "@/lib/dashboard-definitions";
import { formatBusinessTime, formatCount, formatRelative } from "@/lib/format";
import { DashboardHeader } from "./dashboard-header";
import { DashboardGrid, DashboardPage } from "./dashboard-layout";
import { NextDeadlinesPanel, PrepTotalsPanel, StationLoadPanel } from "./kitchen-panels";
import { useKitchenDashboard, useTodayKitchenBoard } from "./queries";

const D = DEFINITIONS.kitchen;

/** For the kitchen lead at 6 am on a tablet. */
export function KitchenDashboard() {
  const { timeZone, nowMs } = useBusinessClock();
  const dashboard = useKitchenDashboard();
  const today = dashboard.data?.businessDate;
  const board = useTodayKitchenBoard(today);
  const m = dashboard.data?.metrics;
  const loading = dashboard.isLoading;
  const boardProps = { units: board.data, loading: board.isLoading || !today, error: board.error, onRetry: () => void board.refetch() };

  return (
    <DashboardPage>
      <DashboardHeader
            businessDate={today}
            updatedAt={dashboard.dataUpdatedAt}
            onRefresh={() => {
              void dashboard.refetch();
              void board.refetch();
            }}
            refreshing={dashboard.isFetching || board.isFetching}
          />
      <Button size="lg" className="h-12 w-full text-base sm:w-fit" render={<Link href="/kitchen" />} nativeButton={false}>
        <ChefHat data-icon="inline-start" />
        Open kitchen board
      </Button>

      {dashboard.error ? (
        <ErrorState error={dashboard.error} title="Could not load the kitchen dashboard" onRetry={() => dashboard.refetch()} />
      ) : (
        <KpiGrid>
          <KpiTile label="Late now" value={m ? formatCount(m.late) : null} sub="unfinished, past deadline" definition={D.late} href="/kitchen" loading={loading} />
          <KpiTile label="At risk" value={m ? formatCount(m.atRisk) : null} sub="inside the at-risk window" definition={D.atRisk} href="/kitchen" loading={loading} />
          <KpiTile label="In progress" value={m ? formatCount(m.started) : null} sub="started, not done" definition={D.started} href="/kitchen" loading={loading} />
          <KpiTile label="Not started" value={m ? formatCount(m.notStarted) : null} sub="prep units today" definition={D.notStarted} href="/kitchen" loading={loading} />
          <KpiTile
            label="Next deadline"
            value={m ? (m.nextDeadline ? formatBusinessTime(m.nextDeadline.plannedKitchenReadyAt, timeZone) : "—") : null}
            sub={
              m?.nextDeadline
                ? `${formatRelative(m.nextDeadline.plannedKitchenReadyAt, nowMs)} · ${m.nextDeadline.orderNumber} · ${m.nextDeadline.remainingUnits} left`
                : "all of today's units are done"
            }
            definition={D.nextDeadline}
            href="/kitchen"
            loading={loading}
          />
        </KpiGrid>
      )}

      <DashboardGrid
        main={
          <>
            <NextDeadlinesPanel {...boardProps} />
            <StationLoadPanel {...boardProps} />
          </>
        }
        rail={<PrepTotalsPanel {...boardProps} />}
      />
    </DashboardPage>
  );
}
