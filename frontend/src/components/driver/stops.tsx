"use client";

import { Check, Copy, MapPin, Navigation, Package } from "lucide-react";
import { toast } from "sonner";
import { StatusBadge } from "@/components/app/status-badge";
import { Button } from "@/components/ui/button";
import type { DriverDrop } from "@/lib/api";
import { formatBusinessTime, formatCount, formatDuration, formatRelative, packagingText } from "@/lib/format";

export function fullAddress(drop: DriverDrop): string {
  return [drop.addressLine1Snapshot, drop.addressLine2Snapshot, drop.addressCitySnapshot, drop.addressRegionSnapshot, drop.addressPostalCodeSnapshot, drop.addressCountrySnapshot]
    .filter(Boolean)
    .join(", ");
}

export function OnTimeChip({ drop }: { drop: DriverDrop }) {
  if (drop.onTime === null || !drop.deliveredAt) return null;
  const late = new Date(drop.deliveredAt).getTime() - new Date(drop.scheduledDeliveryAt).getTime();
  return drop.onTime ? <StatusBadge kind="onTime" value="ON_TIME" size="sm" /> : <StatusBadge kind="onTime" value="LATE" size="sm" label={`Late ${formatDuration(late)}`} />;
}

/** The next undelivered stop, expanded. */
export function HeroStop({ drop, timeZone, nowMs }: { drop: DriverDrop; timeZone: string; nowMs: number }) {
  const address = fullAddress(drop);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(address);
      toast.success("Address copied");
    } catch {
      toast.error("Could not copy. Long-press the address instead.");
    }
  };
  return (
    <article className="flex flex-col gap-4 rounded-xl border-2 border-primary/30 bg-card p-4" aria-label="Next stop">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="label-caps text-muted-foreground">Next stop</p>
          <p className="num text-[28px] leading-tight font-semibold">{formatBusinessTime(drop.scheduledDeliveryAt, timeZone)}</p>
          <p className="num text-sm text-muted-foreground">{formatRelative(drop.scheduledDeliveryAt, nowMs)}</p>
        </div>
        <StatusBadge kind="drop" value={drop.status} />
      </div>
      <div>
        <p className="text-lg font-semibold">{drop.company.name}</p>
        <p className="mt-1 flex gap-1.5 text-base">
          <MapPin aria-hidden className="mt-1 size-4 shrink-0 text-muted-foreground" />
          <span>
            <span className="font-medium">{drop.addressLabelSnapshot}</span>
            <span className="block text-muted-foreground">{address}</span>
          </span>
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" className="h-11" onClick={() => void copy()}>
          <Copy data-icon="inline-start" /> Copy
        </Button>
        <Button
          variant="outline"
          className="h-11"
          render={<a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`} target="_blank" rel="noreferrer" />}
          nativeButton={false}
        >
          <Navigation data-icon="inline-start" /> Open in Maps
        </Button>
      </div>
      {drop.company.driverInstructions && (
        <div className="rounded-lg border border-info/20 bg-info-soft p-3 text-sm text-foreground">
          <p className="label-caps mb-1 text-info">Instructions</p>
          {drop.company.driverInstructions}
        </div>
      )}
      <div className="flex items-start gap-2 rounded-lg border bg-muted/50 p-3 text-sm">
        <Package className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
        <div>
          <p className="font-medium">{packagingText(drop.packaging) || "No packaging recorded"}</p>
          <p className="num text-muted-foreground">
            {formatCount(drop.meals)} meal{drop.meals === 1 ? "" : "s"} · {formatCount(drop._count.orders)} order{drop._count.orders === 1 ? "" : "s"}
          </p>
        </div>
      </div>
    </article>
  );
}

export function UpcomingStop({ drop, timeZone }: { drop: DriverDrop; timeZone: string }) {
  return (
    <div className="flex min-h-14 items-center gap-3 rounded-lg border bg-card px-3 py-2">
      <span className="num w-12 text-base font-semibold">{formatBusinessTime(drop.scheduledDeliveryAt, timeZone)}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{drop.company.name}</span>
        <span className="block truncate text-sm text-muted-foreground">
          {drop.addressLabelSnapshot} · <span className="num">{formatCount(drop.meals)}</span> meals
        </span>
        {drop.packaging.length > 0 && <span className="block truncate text-xs text-muted-foreground">{packagingText(drop.packaging)}</span>}
      </span>
      <StatusBadge kind="drop" value={drop.status} size="sm" />
    </div>
  );
}

export function DeliveredStop({ drop, timeZone }: { drop: DriverDrop; timeZone: string }) {
  return (
    <div className="flex min-h-12 items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground">
      <span className="grid size-6 place-items-center rounded-full bg-success-soft text-success">
        <Check className="size-3.5" aria-label="Delivered" />
      </span>
      <span className="min-w-0 flex-1 truncate">{drop.company.name}</span>
      <span className="num text-sm">{drop.deliveredAt ? formatBusinessTime(drop.deliveredAt, timeZone) : ""}</span>
      <OnTimeChip drop={drop} />
    </div>
  );
}
