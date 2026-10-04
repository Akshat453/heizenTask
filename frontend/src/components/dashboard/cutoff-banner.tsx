"use client";

import { Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useBusinessClock } from "@/hooks/use-business-clock";
import type { CutoffInfo } from "@/lib/api";
import { businessDateOf, formatBusinessDate, formatBusinessTime, formatDuration } from "@/lib/format";
import { cn } from "@/lib/utils";
import { nextCutoff } from "./use-cutoff-window";

const WARNING_MS = 2 * 60 * 60_000;

/** "Next cut-off Tue 6 Oct, 16:00 for Thu 8 Oct deliveries · in 1 day 6 h" (all values from the API). */
export function CutoffBanner({ window, loading }: { window: CutoffInfo[] | undefined; loading: boolean }) {
  const { timeZone, nowMs } = useBusinessClock();
  if (loading) return <Skeleton className="h-10 w-full max-w-2xl" />;
  const next = nextCutoff(window);
  if (!next) return null;

  const remaining = new Date(next.cutoffInstant).getTime() - nowMs;
  const soon = remaining < WARNING_MS;
  const dates = next.deliveryDates.map((d) => formatBusinessDate(d));
  return (
    <div
      role="status"
      className={cn(
        "flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border px-3 py-2 text-sm",
        soon ? "border-warning/30 bg-warning-soft text-warning" : "bg-card",
      )}
    >
      {soon ? <Clock aria-hidden className="size-4" /> : <span aria-hidden className="size-2 rounded-full bg-saffron" />}
      <span>
        Next cut-off{" "}
        <span className="num font-medium">
          {formatBusinessDate(businessDateOf(next.cutoffInstant, timeZone))}, {formatBusinessTime(next.cutoffInstant, timeZone)}
        </span>{" "}
        for {dates.join(", ")} deliveries
      </span>
      <span className={cn("num", !soon && "text-muted-foreground")}>· {remaining > 0 ? `in ${formatDuration(remaining)}` : "now"}</span>
    </div>
  );
}
