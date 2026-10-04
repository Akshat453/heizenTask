"use client";

import { ChefHat, Eye, RotateCw } from "lucide-react";
import { useEffect, useMemo } from "react";
import { EmptyState } from "@/components/app/empty-state";
import { ErrorState } from "@/components/app/error-state";
import { PageHeader } from "@/components/app/page-header";
import { useAuth } from "@/components/auth/auth-provider";
import { boardTotals, filterUnits, prepTotalRows, stationTabs } from "@/components/kitchen/board-model";
import { ByUnitView } from "@/components/kitchen/by-unit-view";
import { KitchenHeader } from "@/components/kitchen/kitchen-header";
import { PrepTotalsView } from "@/components/kitchen/prep-totals-view";
import { BOARD_REFRESH_MS, useKitchenBoard } from "@/components/kitchen/queries";
import { SummaryStrip } from "@/components/kitchen/summary-strip";
import { useKitchenParams } from "@/components/kitchen/use-kitchen-params";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useBusinessClock } from "@/hooks/use-business-clock";
import { useNow } from "@/hooks/use-now";
import { P } from "@/lib/permissions";
import { cn } from "@/lib/utils";

export default function KitchenBoardPage() {
  const { can } = useAuth();
  const { businessDate: today, timeZone, nowMs } = useBusinessClock();
  const kitchen = useKitchenParams(today);
  const { params, setParams, date, filters } = kitchen;
  const board = useKitchenBoard(date);
  const now = useNow(5_000);
  const canUpdate = can(P.kitchenUpdate);

  // Esc leaves wall mode.
  useEffect(() => {
    if (!params.wall) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && void setParams({ wall: null });
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [params.wall, setParams]);

  const units = board.data;
  const tabs = useMemo(() => stationTabs(units ?? []), [units]);
  const visible = useMemo(() => filterUnits(units ?? [], filters), [units, filters]);
  const totals = useMemo(() => boardTotals(visible), [visible]);
  const totalsRows = useMemo(() => prepTotalRows(filterUnits(units ?? [], { ...filters, combo: null })), [units, filters]);
  const updatedAgo = board.dataUpdatedAt && now ? Math.max(0, Math.round((now - board.dataUpdatedAt) / 1000)) : null;

  const body = (
    <div className={cn("flex flex-col gap-4", params.wall ? "text-[18px]" : "text-[16px]")}>
      <KitchenHeader {...kitchen} today={today} tabs={tabs} allRemaining={tabs.reduce((s, t) => s + t.remaining, 0)} />
      <div className={cn("sticky z-10 -mx-1 bg-background px-1 pb-1", params.wall ? "top-0" : "top-14")}>
        <SummaryStrip totals={totals} timeZone={timeZone} nowMs={nowMs} />
        <p className="mt-1 flex items-center gap-2 text-[0.75em] text-muted-foreground">
          {!canUpdate && (
            <span className="inline-flex items-center gap-1 rounded-md border bg-neutral-soft px-1.5 text-neutral">
              <Eye className="size-3" /> View only
            </span>
          )}
          {updatedAgo !== null && <span>Updated {updatedAgo < 5 ? "just now" : `${updatedAgo} s ago`} · refreshes every {BOARD_REFRESH_MS / 1000} s</span>}
          <Button variant="ghost" size="icon-xs" aria-label="Refresh board" disabled={board.isFetching} onClick={() => void board.refetch()}>
            <RotateCw className={cn(board.isFetching && "animate-spin")} />
          </Button>
        </p>
      </div>

      {board.isLoading || !date ? (
        <div className="grid gap-4 lg:grid-cols-3" aria-busy="true">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="flex flex-col gap-3">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-48" />
              <Skeleton className="h-48" />
            </div>
          ))}
        </div>
      ) : board.error ? (
        <ErrorState error={board.error} title="Could not load the kitchen board" onRetry={() => void board.refetch()} isRetrying={board.isFetching} />
      ) : (units ?? []).length === 0 ? (
        <EmptyState icon={ChefHat} title="No prep units for this day" description="Units appear once orders for this date are confirmed at cut-off. Try another day." />
      ) : params.view === "totals" ? (
        <PrepTotalsView rows={totalsRows} timeZone={timeZone} onSelect={(combo) => void setParams({ combo, view: null })} />
      ) : (
        <ByUnitView
          date={date}
          units={visible}
          allUnits={units ?? []}
          timeZone={timeZone}
          nowMs={nowMs}
          showStation={!params.station}
          canUpdate={canUpdate}
          canForce={can(P.kitchenForceComplete)}
          columnHeight={params.wall ? "h-[70dvh] lg:h-[calc(100dvh-19rem)]" : "h-[70dvh] lg:h-[calc(100dvh-24rem)]"}
        />
      )}
    </div>
  );

  if (params.wall)
    return (
      <div role="dialog" aria-modal="true" aria-label="Kitchen board, wall mode" className="fixed inset-0 z-50 overflow-y-auto bg-background p-4 lg:p-6">
        {body}
      </div>
    );

  return (
    <main className="flex flex-col gap-4 p-4 md:p-6">
      <PageHeader title="Kitchen board" description="Prep units for confirmed orders. Timing comes from the server; colours change at its thresholds." />
      {body}
    </main>
  );
}
