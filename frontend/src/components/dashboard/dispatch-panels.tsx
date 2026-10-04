"use client";

import { Clock, Truck, UserCheck, Users } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/app/empty-state";
import { ErrorState } from "@/components/app/error-state";
import { Panel } from "@/components/app/panel";
import { StatusBadge } from "@/components/app/status-badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useBusinessClock } from "@/hooks/use-business-clock";
import type { DispatchDrop } from "@/lib/api";
import { formatBusinessTime, formatCount, formatRelative } from "@/lib/format";

type DropsProps = { drops: DispatchDrop[] | undefined; loading: boolean; error: unknown; onRetry: () => void; truncated: boolean };

const WINDOW_MS = 3 * 60 * 60_000;

function fallback({ drops, loading, error, onRetry }: DropsProps, what: string) {
  if (loading)
    return (
      <div className="flex flex-col gap-3 p-4" aria-busy="true">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  if (error) return <div className="p-4"><ErrorState error={error} title={`Could not load ${what}`} onRetry={onRetry} /></div>;
  if (!drops?.length) return <EmptyState icon={Truck} title="No drops today" description="Drops appear when every order for a company, address and time is kitchen-ready." />;
  return null;
}

function DropRow({ drop, aside }: { drop: DispatchDrop; aside: React.ReactNode }) {
  const { timeZone, nowMs } = useBusinessClock();
  return (
    <li className="flex items-center gap-3 px-4 py-2.5">
      <div className="w-14 shrink-0">
        <p className="num text-base font-semibold">{formatBusinessTime(drop.scheduledDeliveryAt, timeZone)}</p>
        <p className="num text-xs text-muted-foreground">{formatRelative(drop.scheduledDeliveryAt, nowMs)}</p>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{drop.company.name}</p>
        <p className="truncate text-xs text-muted-foreground">
          {drop.addressLabelSnapshot} · {formatCount(drop._count.orders)} order{drop._count.orders === 1 ? "" : "s"}
        </p>
      </div>
      <div className="shrink-0">{aside}</div>
    </li>
  );
}

const truncatedNote = (truncated: boolean) =>
  truncated ? <p className="border-t px-4 py-2 text-xs text-muted-foreground">Showing the first 100 drops of the day. Open Dispatch for the rest.</p> : null;

export function UnassignedDropsPanel(props: DropsProps) {
  const rows = (props.drops ?? []).filter((d) => d.status === "DISPATCH_READY" && !d.driverStaffUserId);
  return (
    <Panel title="Needs a driver" description="Ready-to-leave drops with no driver, soonest first." flush>
      {fallback(props, "drops") ??
        (rows.length === 0 ? (
          <EmptyState icon={UserCheck} title="Every ready drop has a driver" description="New drops appear here as orders become kitchen-ready." />
        ) : (
          <ul className="divide-y">
            {rows.map((drop) => (
              <DropRow
                key={drop.id}
                drop={drop}
                aside={
                  <Button size="sm" render={<Link href="/dispatch" />} nativeButton={false}>
                    Assign
                  </Button>
                }
              />
            ))}
          </ul>
        ))}
      {truncatedNote(props.truncated)}
    </Panel>
  );
}

export function NextDeliveriesPanel(props: DropsProps) {
  const { nowMs } = useBusinessClock();
  const rows = (props.drops ?? []).filter((d) => {
    const at = new Date(d.scheduledDeliveryAt).getTime();
    return d.status !== "DELIVERED" && at >= nowMs && at <= nowMs + WINDOW_MS;
  });
  return (
    <Panel title="Next 3 hours" description="Undelivered drops by scheduled delivery time, with their driver." flush>
      {fallback(props, "drops") ??
        (rows.length === 0 ? (
          <EmptyState icon={Clock} title="Nothing due in the next 3 hours" description="Later drops appear here as their delivery time approaches." />
        ) : (
          <ul className="divide-y">
            {rows.map((drop) => (
              <DropRow
                key={drop.id}
                drop={drop}
                aside={
                  <div className="flex flex-col items-end gap-1">
                    <StatusBadge kind="drop" value={drop.status} size="sm" />
                    <span className="text-xs text-muted-foreground">{drop.driver?.name ?? "No driver"}</span>
                  </div>
                }
              />
            ))}
          </ul>
        ))}
    </Panel>
  );
}

export function DriverLoadPanel(props: DropsProps) {
  const byDriver = new Map<string, { name: string; delivered: number; remaining: number }>();
  for (const drop of props.drops ?? []) {
    if (!drop.driverStaffUserId) continue;
    const row = byDriver.get(drop.driverStaffUserId) ?? { name: drop.driver?.name ?? "Driver", delivered: 0, remaining: 0 };
    if (drop.status === "DELIVERED") row.delivered++;
    else row.remaining++;
    byDriver.set(drop.driverStaffUserId, row);
  }
  const rows = [...byDriver.values()].sort((a, b) => b.remaining - a.remaining || a.name.localeCompare(b.name));
  return (
    <Panel title="Driver load" description="Today's assigned drops per driver." flush>
      {fallback(props, "driver load") ??
        (rows.length === 0 ? (
          <EmptyState icon={Users} title="No drivers assigned yet" description="Assign a driver to a ready drop to see their load here." />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th scope="col" className="label-caps px-4 py-2 text-left text-muted-foreground">Driver</th>
                <th scope="col" className="label-caps px-2 py-2 text-right text-muted-foreground">Delivered</th>
                <th scope="col" className="label-caps px-4 py-2 text-right text-muted-foreground">Remaining</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.name} className="border-b last:border-0">
                  <td className="px-4 py-2">{row.name}</td>
                  <td className="num px-2 py-2 text-right">{formatCount(row.delivered)}</td>
                  <td className="num px-4 py-2 text-right font-semibold">{formatCount(row.remaining)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ))}
    </Panel>
  );
}
