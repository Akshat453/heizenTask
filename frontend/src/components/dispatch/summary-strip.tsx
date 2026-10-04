import { formatCount } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { dispatchTotals } from "./dispatch-model";

type Totals = ReturnType<typeof dispatchTotals>;

function Stat({ label, value, sub, tone }: { label: string; value: number; sub?: string; tone?: "warning" }) {
  return (
    <div className={cn("flex flex-col rounded-lg border bg-card p-3", tone && value > 0 && "border-warning/30 bg-warning-soft")}>
      <span className="label-caps text-muted-foreground">{label}</span>
      <span className={cn("num text-2xl font-semibold", tone && value > 0 && "text-warning")}>{formatCount(value)}</span>
      {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
    </div>
  );
}

/** Counts of the API's drop states for the selected day (and confirmed orders without a drop). */
export function DispatchSummary({ totals, showWaiting }: { totals: Totals; showWaiting: boolean }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
      <Stat label="Drops" value={totals.drops} />
      {showWaiting && <Stat label="Waiting on kitchen" value={totals.waiting} sub="orders without a drop" />}
      <Stat label="Ready to leave" value={totals.ready} />
      <Stat label="Out for delivery" value={totals.out} />
      <Stat label="Delivered" value={totals.delivered} sub={`${formatCount(totals.onTime)} on time`} />
      <Stat label="No driver" value={totals.noDriver} sub="ready, unassigned" tone="warning" />
    </div>
  );
}
