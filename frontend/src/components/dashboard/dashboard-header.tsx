"use client";

import { RotateCw } from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useBusinessClock } from "@/hooks/use-business-clock";
import { businessHourOf, formatBusinessDateLong, formatBusinessTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { DASHBOARD_REFRESH_MS } from "./queries";

type DashboardHeaderProps = {
  /** Backend business date from the dashboard response. */
  businessDate: string | undefined;
  /** Latest dataUpdatedAt of the dashboard's queries (epoch ms, 0 = not loaded). */
  updatedAt: number;
  onRefresh: () => void;
  refreshing: boolean;
};

function greeting(hour: number) {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function DashboardHeader({ businessDate, updatedAt, onRefresh, refreshing }: DashboardHeaderProps) {
  const { user } = useAuth();
  const { timeZone, nowMs } = useBusinessClock();
  const firstName = user?.name.split(/\s+/)[0] ?? "";

  return (
    <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {greeting(businessHourOf(nowMs, timeZone))}, {firstName}
        </h1>
        {businessDate ? (
          <p className="mt-1 text-sm text-muted-foreground">{formatBusinessDateLong(businessDate)}</p>
        ) : (
          <Skeleton className="mt-2 h-4 w-40" />
        )}
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {updatedAt > 0 && (
          <span>
            Updated <span className="num">{formatBusinessTime(new Date(updatedAt), timeZone)}</span> · refreshes every{" "}
            {DASHBOARD_REFRESH_MS / 1000}s
          </span>
        )}
        <Button variant="outline" size="icon-sm" aria-label="Refresh dashboard" onClick={onRefresh} disabled={refreshing}>
          <RotateCw className={cn(refreshing && "animate-spin")} />
        </Button>
      </div>
    </header>
  );
}
