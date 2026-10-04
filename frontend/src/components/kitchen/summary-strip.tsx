import { Progress } from "@/components/ui/progress";
import { formatBusinessTime, formatCount, formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { boardTotals } from "./board-model";

type Totals = ReturnType<typeof boardTotals>;

function Stat({ label, value, tone }: { label: string; value: string; tone?: "danger" | "warning" }) {
  return (
    <div className="flex flex-col">
      <span className="label-caps text-muted-foreground">{label}</span>
      <span className={cn("num text-[1.5em] leading-tight font-semibold", tone === "danger" && "text-danger", tone === "warning" && "text-warning")}>{value}</span>
    </div>
  );
}

/** Counts of the API's prep and timing states for the current filters. */
export function SummaryStrip({ totals, timeZone, nowMs }: { totals: Totals; timeZone: string; nowMs: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 rounded-lg border bg-card p-3 sm:grid-cols-3 lg:grid-cols-[auto_minmax(10rem,1.5fr)_auto_auto_auto_minmax(12rem,2fr)] lg:items-end">
      <Stat label="Units" value={formatCount(totals.total)} />
      <div className="flex flex-col gap-1">
        <span className="label-caps text-muted-foreground">Done</span>
        <span className="num text-[1.5em] leading-tight font-semibold">
          {formatCount(totals.done)} <span className="text-[0.6em] font-normal text-muted-foreground">of {formatCount(totals.total)}</span>
        </span>
        <Progress value={totals.total ? (totals.done / totals.total) * 100 : 0} aria-label="Units done" />
      </div>
      <Stat label="In progress" value={formatCount(totals.inProgress)} />
      <Stat label="Late" value={formatCount(totals.late)} tone={totals.late ? "danger" : undefined} />
      <Stat label="At risk" value={formatCount(totals.atRisk)} tone={totals.atRisk ? "warning" : undefined} />
      <div className="col-span-2 flex flex-col sm:col-span-1">
        <span className="label-caps text-muted-foreground">Next ready-by</span>
        <span className="text-[1.125em] font-semibold">
          {totals.next ? (
            <>
              <span className="num">{formatBusinessTime(totals.next.plannedKitchenReadyAt, timeZone)}</span>
              <span className="num font-normal text-muted-foreground"> · {formatRelative(totals.next.plannedKitchenReadyAt, nowMs)}</span>
            </>
          ) : (
            <span className="text-muted-foreground">All done</span>
          )}
        </span>
      </div>
    </div>
  );
}
