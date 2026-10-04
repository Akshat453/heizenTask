"use client";

import { CircleCheck, Truck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { EmptyState } from "@/components/app/empty-state";
import { ErrorState } from "@/components/app/error-state";
import { useAuth } from "@/components/auth/auth-provider";
import { DeliverSheet } from "@/components/driver/deliver-sheet";
import { useDriverToday } from "@/components/driver/queries";
import { DeliveredStop, HeroStop, UpcomingStop } from "@/components/driver/stops";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useBusinessClock } from "@/hooks/use-business-clock";
import type { DeliveryDrop, DriverDrop } from "@/lib/api";
import { formatCount, formatDuration } from "@/lib/format";
import { P } from "@/lib/permissions";
import { cn } from "@/lib/utils";

function resultText(result: DeliveryDrop): string {
  if (result.onTime || !result.deliveredAt) return "Delivered on time";
  const late = new Date(result.deliveredAt).getTime() - new Date(result.scheduledDeliveryAt).getTime();
  return `Delivered ${formatDuration(late)} late`;
}

/** Phone-first route for the signed-in driver: progress, the next stop expanded, a sticky Mark delivered. */
export default function DriverRoutePage() {
  const { can } = useAuth();
  const { timeZone, nowMs } = useBusinessClock();
  const today = useDriverToday();
  const [delivering, setDelivering] = useState<DriverDrop | null>(null);
  const [lastResult, setLastResult] = useState<DeliveryDrop | null>(null);

  const drops = [...(today.data?.data ?? [])].sort((a, b) => a.scheduledDeliveryAt.localeCompare(b.scheduledDeliveryAt));
  const delivered = drops.filter((d) => d.status === "DELIVERED");
  const pending = drops.filter((d) => d.status !== "DELIVERED");
  const next = pending[0];
  const late = delivered.filter((d) => d.onTime === false).length;
  const canDeliver = can(P.driverOwnDropsDeliver);
  const blocker = next && next.status !== "OUT_FOR_DELIVERY" ? "Dispatch hasn't sent this drop out yet." : null;

  return (
    <main className="mx-auto flex w-full max-w-[480px] flex-col gap-4 px-4 pt-4 pb-32">
      {today.isLoading ? (
        <>
          <Skeleton className="h-20" />
          <Skeleton className="h-80" />
        </>
      ) : today.error ? (
        <ErrorState error={today.error} title="Could not load your route" onRetry={() => void today.refetch()} />
      ) : drops.length === 0 ? (
        <div className="rounded-lg border bg-card">
          <EmptyState icon={Truck} title="No deliveries assigned for today." description="Dispatch assigns drops as orders become ready. This page refreshes every 30 seconds." />
        </div>
      ) : (
        <>
          <section className="rounded-lg border bg-card p-4" aria-label="Progress">
            <div className="flex items-baseline justify-between">
              <p className="text-lg font-semibold">
                <span className="num">{formatCount(delivered.length)}</span> of <span className="num">{formatCount(drops.length)}</span> delivered
              </p>
              {late > 0 && <span className="text-sm font-medium text-danger">{late} late</span>}
            </div>
            <Progress value={(delivered.length / drops.length) * 100} className="mt-3" aria-label="Delivered" />
          </section>

          {lastResult && (
            <p role="status" className={cn("flex items-center gap-2 rounded-lg border p-3 text-sm font-medium", lastResult.onTime ? "border-success/30 bg-success-soft text-success" : "border-danger/30 bg-danger-soft text-danger")}>
              <CircleCheck className="size-4" /> {resultText(lastResult)}
            </p>
          )}

          <ol className="flex flex-col gap-2" aria-label="Stops in time order">
            {drops.map((drop) => (
              <li key={drop.id}>
                {drop.status === "DELIVERED" ? (
                  <DeliveredStop drop={drop} timeZone={timeZone} />
                ) : drop.id === next?.id ? (
                  <HeroStop drop={drop} timeZone={timeZone} nowMs={nowMs} />
                ) : (
                  <UpcomingStop drop={drop} timeZone={timeZone} />
                )}
              </li>
            ))}
          </ol>
          {!next && <EmptyState icon={CircleCheck} title="All of today's drops are delivered" description="Nice work." />}
        </>
      )}

      {next && canDeliver && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur">
          <div className="mx-auto max-w-[480px]">
            {blocker && <p className="mb-2 text-center text-sm text-muted-foreground">{blocker}</p>}
            <Button className="h-14 w-full text-base" disabled={Boolean(blocker)} onClick={() => setDelivering(next)}>
              <CircleCheck data-icon="inline-start" /> Mark delivered
            </Button>
          </div>
        </div>
      )}

      {delivering && (
        <DeliverSheet
          drop={delivering}
          onClose={() => setDelivering(null)}
          onDelivered={(result) => {
            setDelivering(null);
            setLastResult(result);
            toast.success(resultText(result));
          }}
        />
      )}
    </main>
  );
}
