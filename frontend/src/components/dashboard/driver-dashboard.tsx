"use client";

import { useQuery } from "@tanstack/react-query";
import { MapPin, Route, Truck } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/app/empty-state";
import { ErrorState } from "@/components/app/error-state";
import { StatusBadge } from "@/components/app/status-badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useBusinessClock } from "@/hooks/use-business-clock";
import { driverApi } from "@/lib/api";
import { DEFINITIONS } from "@/lib/dashboard-definitions";
import { formatBusinessTime, formatCount, formatRelative } from "@/lib/format";
import { DashboardHeader } from "./dashboard-header";
import { DashboardPage } from "./dashboard-layout";
import { DASHBOARD_REFRESH_MS, dashboardKeys, useDriverDashboard } from "./queries";

const D = DEFINITIONS.driver;

/** Phone-first: progress, then the next stop as a hero card. */
export function DriverDashboard() {
  const { timeZone, nowMs } = useBusinessClock();
  const dashboard = useDriverDashboard();
  const route = useQuery({
    queryKey: [...dashboardKeys.all, "driver-route"],
    queryFn: driverApi.today,
    refetchInterval: DASHBOARD_REFRESH_MS,
  });
  const m = dashboard.data?.metrics;
  const next = m?.nextDrop ? route.data?.data.find((drop) => drop.id === m.nextDrop?.id) : undefined;
  const onTime = route.data?.data.filter((drop) => drop.onTime === true).length;

  return (
    <DashboardPage>
      <div className="mx-auto flex w-full max-w-md flex-col gap-4">
        <DashboardHeader
          businessDate={dashboard.data?.businessDate}
          updatedAt={dashboard.dataUpdatedAt}
          onRefresh={() => {
            void dashboard.refetch();
            void route.refetch();
          }}
          refreshing={dashboard.isFetching}
        />

        {dashboard.isLoading ? (
          <>
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-56 w-full" />
          </>
        ) : dashboard.error ? (
          <ErrorState error={dashboard.error} title="Could not load your deliveries" onRetry={() => dashboard.refetch()} />
        ) : !m || m.todayDrops === 0 ? (
          <div className="rounded-lg border bg-card">
            <EmptyState icon={Truck} title="No deliveries assigned for today." description="Dispatch assigns drops as orders become ready. This page refreshes every minute." />
          </div>
        ) : (
          <>
            <section className="rounded-lg border bg-card p-4" aria-label="Today's progress">
              <div className="flex items-baseline justify-between gap-2">
                <Tooltip>
                  <TooltipTrigger render={<p />} className="text-lg font-semibold">
                    <span className="num">{formatCount(m.delivered)}</span> of <span className="num">{formatCount(m.todayDrops)}</span> delivered
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs text-xs">{`${D.todayDrops} ${D.delivered}`}</TooltipContent>
                </Tooltip>
                <span className="text-sm text-muted-foreground">
                  <span className="num">{formatCount(m.remaining)}</span> to go
                </span>
              </div>
              <Progress value={(m.delivered / m.todayDrops) * 100} className="mt-3" aria-label="Delivered today" />
              {onTime !== undefined && m.delivered > 0 && (
                <p className="mt-2 text-xs text-muted-foreground">
                  <span className="num">{formatCount(onTime)}</span> of {formatCount(m.delivered)} delivered on time
                </p>
              )}
            </section>

            {m.nextDrop ? (
              <section className="flex flex-col gap-4 rounded-lg border bg-card p-4" aria-label="Next stop">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="label-caps text-muted-foreground">Next stop</p>
                    <p className="num mt-1 text-4xl font-semibold tracking-tight">{formatBusinessTime(m.nextDrop.scheduledDeliveryAt, timeZone)}</p>
                    <p className="num text-sm text-muted-foreground">{formatRelative(m.nextDrop.scheduledDeliveryAt, nowMs)}</p>
                  </div>
                  <StatusBadge kind="drop" value={m.nextDrop.status} />
                </div>
                <div>
                  <p className="text-base font-semibold">{m.nextDrop.companyName}</p>
                  <p className="mt-1 flex gap-1.5 text-sm text-muted-foreground">
                    <MapPin aria-hidden className="mt-0.5 size-4 shrink-0" />
                    {next
                      ? [next.addressLabelSnapshot, next.addressLine1Snapshot, next.addressLine2Snapshot, next.addressCitySnapshot].filter(Boolean).join(", ")
                      : m.nextDrop.addressCitySnapshot}
                  </p>
                  {next?.company.driverInstructions && (
                    <p className="mt-2 line-clamp-2 rounded-md bg-muted px-3 py-2 text-sm">{next.company.driverInstructions}</p>
                  )}
                </div>
                <Button size="lg" className="h-14 w-full text-base" render={<Link href="/driver" />} nativeButton={false}>
                  <Route data-icon="inline-start" />
                  Go to my route
                </Button>
              </section>
            ) : (
              <div className="rounded-lg border bg-card">
                <EmptyState icon={Truck} title="All of today's drops are delivered" description="Nice work. New assignments will show up here." />
              </div>
            )}
          </>
        )}
      </div>
    </DashboardPage>
  );
}
