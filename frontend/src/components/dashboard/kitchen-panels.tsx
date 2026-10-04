"use client";

import { ChefHat, CookingPot, Timer } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/app/empty-state";
import { ErrorState } from "@/components/app/error-state";
import { Panel } from "@/components/app/panel";
import { StatusBadge } from "@/components/app/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useBusinessClock } from "@/hooks/use-business-clock";
import type { KitchenBoardUnit } from "@/lib/api";
import { formatBusinessTime, formatCount, formatDuration, formatRelative } from "@/lib/format";
import { nextDeadlines, prepTotals, stationLoad } from "./kitchen-board-groups";

type BoardProps = { units: KitchenBoardUnit[] | undefined; loading: boolean; error: unknown; onRetry: () => void };

function RowsSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-3" aria-busy="true">
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-6 w-full" />
      ))}
    </div>
  );
}

function boardState({ units, loading, error, onRetry }: BoardProps, title: string) {
  if (loading) return <RowsSkeleton />;
  if (error) return <ErrorState error={error} title={`Could not load ${title}`} onRetry={onRetry} />;
  if (!units?.length) return <EmptyState icon={ChefHat} title="No prep units today" description="Units appear here once orders for today are confirmed at cut-off." />;
  return null;
}

export function StationLoadPanel(props: BoardProps) {
  const fallback = boardState(props, "station load");
  const rows = props.units ? stationLoad(props.units) : [];
  return (
    <Panel title="Station load" description="Today's prep units by station, most work remaining first. Select a station to open its board.">
      {fallback ?? (
        <ul className="flex flex-col gap-3">
          {rows.map((row) => {
            const total = row.notStarted + row.started + row.done;
            const pct = (n: number) => `${(n / total) * 100}%`;
            return (
              <li key={row.key}>
                <Link
                  href={row.stationId ? `/kitchen?station=${row.stationId}` : "/kitchen"}
                  className="group block rounded-md p-1 -m-1 hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  <div className="mb-1.5 flex items-baseline justify-between gap-2 text-sm">
                    <span className="font-medium group-hover:underline">{row.name}</span>
                    <span className="num text-xs text-muted-foreground">
                      {formatCount(row.notStarted)} not started · {formatCount(row.started)} in progress · {formatCount(row.done)} done
                    </span>
                  </div>
                  <div className="flex h-2.5 overflow-hidden rounded-full bg-muted" role="img" aria-label={`${row.name}: ${row.done} of ${total} done`}>
                    <span className="bg-neutral/50" style={{ width: pct(row.notStarted) }} />
                    <span className="bg-progress" style={{ width: pct(row.started) }} />
                    <span className="bg-success" style={{ width: pct(row.done) }} />
                  </div>
                </Link>
              </li>
            );
          })}
          <li className="flex flex-wrap gap-3 pt-1 text-xs text-muted-foreground" aria-hidden>
            <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-neutral/50" />Not started</span>
            <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-progress" />In progress</span>
            <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-success" />Done</span>
          </li>
        </ul>
      )}
    </Panel>
  );
}

export function NextDeadlinesPanel(props: BoardProps) {
  const { timeZone, nowMs } = useBusinessClock();
  const fallback = boardState(props, "deadlines");
  const rows = props.units ? nextDeadlines(props.units) : [];
  return (
    <Panel title="Next deadlines" description="Orders by planned kitchen-ready time; late and at-risk first." flush>
      {fallback ? (
        <div className="p-4">{fallback}</div>
      ) : rows.length === 0 ? (
        <EmptyState icon={Timer} title="Everything is cooked" description="All of today's prep units are done." />
      ) : (
        <ul className="divide-y">
          {rows.map((row) => {
            const deadline = new Date(row.plannedKitchenReadyAt).getTime();
            const late = row.timingState === "LATE";
            return (
              <li key={row.orderId} className="flex items-center gap-3 px-4 py-2.5">
                <div className="w-14 shrink-0">
                  <p className="num text-base font-semibold">{formatBusinessTime(row.plannedKitchenReadyAt, timeZone)}</p>
                  <p className="num text-xs text-muted-foreground">{formatRelative(row.plannedKitchenReadyAt, nowMs)}</p>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{row.companyName}</p>
                  <p className="text-xs text-muted-foreground">
                    <span className="num">{row.orderNumber}</span> · {formatCount(row.remainingUnits)} unit{row.remainingUnits === 1 ? "" : "s"} left
                  </p>
                </div>
                <StatusBadge
                  kind="timing"
                  value={row.timingState}
                  label={late ? `Late by ${formatDuration(nowMs - deadline)}` : undefined}
                />
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}

export function PrepTotalsPanel(props: BoardProps) {
  const fallback = boardState(props, "prep totals");
  const rows = props.units ? prepTotals(props.units) : [];
  return (
    <Panel title="Prep totals" description="Identical combinations still to cook today, for batch cooking." flush>
      {fallback ? (
        <div className="p-4">{fallback}</div>
      ) : rows.length === 0 ? (
        <EmptyState icon={CookingPot} title="Nothing left to batch" description="Every combination for today is done." />
      ) : (
        <ol className="divide-y">
          {rows.map((row) => (
            <li key={row.key} className="flex items-center justify-between gap-3 px-4 py-2">
              <p className="min-w-0 text-sm">
                <span className="font-medium">{row.dish}</span>
                {row.options.length > 0 && <span className="text-muted-foreground"> · {row.options.join(" · ")}</span>}
              </p>
              <span className="num shrink-0 text-base font-semibold">{formatCount(row.quantity)}</span>
            </li>
          ))}
        </ol>
      )}
    </Panel>
  );
}
