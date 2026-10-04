"use client";

import { Camera, Truck } from "lucide-react";
import type { ReactNode } from "react";
import { StatusBadge } from "@/components/app/status-badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { DispatchDrop, DriverOption } from "@/lib/api";
import { formatBusinessTime, formatDuration } from "@/lib/format";
import { cn } from "@/lib/utils";
import { addressLine, dropSize, outForDeliveryBlocker } from "./dispatch-model";
import { DriverSelect } from "./driver-select";

export type DropCardProps = {
  drop: DispatchDrop;
  timeZone: string;
  nowMs: number;
  drivers: DriverOption[];
  defaultDriverId: string | null;
  canAssign: boolean;
  canAdvance: boolean;
  canViewProof: boolean;
  pending: boolean;
  onAssign: (drop: DispatchDrop, driverId: string) => void;
  onOutForDelivery: (drop: DispatchDrop) => void;
  onViewPhoto: (drop: DispatchDrop) => void;
  onOpen: (drop: DispatchDrop) => void;
};

/** Leave-by countdown from the API's plannedDispatchReadyAt (display arithmetic only). */
function LeaveBy({ drop, timeZone, nowMs }: { drop: DispatchDrop; timeZone: string; nowMs: number }) {
  if (drop.status !== "DISPATCH_READY" || !drop.plannedDispatchReadyAt) return null;
  const ms = new Date(drop.plannedDispatchReadyAt).getTime() - nowMs;
  const time = formatBusinessTime(drop.plannedDispatchReadyAt, timeZone);
  return ms >= 0 ? (
    <StatusBadge kind="dispatchTiming" value="LEAVES_SOON" size="sm" label={`Leave by ${time} · in ${formatDuration(ms)}`} />
  ) : (
    <StatusBadge kind="dispatchTiming" value="LEAVE_PASSED" size="sm" label={`Leave-by ${time} passed ${formatDuration(-ms)} ago`} />
  );
}

type CardChrome = {
  /** Drag handle rendered in the card header (ready drops, users who can advance). */
  dragHandle?: ReactNode;
  className?: string;
};

export function DropCard(props: DropCardProps & CardChrome) {
  const { drop, timeZone, nowMs, canAdvance, pending } = props;
  const blocker = outForDeliveryBlocker(drop);
  const lateMs = drop.deliveredAt ? new Date(drop.deliveredAt).getTime() - new Date(drop.scheduledDeliveryAt).getTime() : 0;

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={() => props.onOpen(drop)}
      onKeyDown={(e) => e.target === e.currentTarget && (e.key === "Enter" || e.key === " ") && props.onOpen(drop)}
      className={cn(
        "flex cursor-pointer flex-col gap-2.5 rounded-lg border bg-card p-3 text-left hover:border-primary/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        props.className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="num text-2xl leading-none font-semibold">{formatBusinessTime(drop.scheduledDeliveryAt, timeZone)}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">delivery time</p>
        </div>
        <div className="flex items-center gap-1">
          <StatusBadge kind="drop" value={drop.status} size="sm" />
          {props.dragHandle}
        </div>
      </div>
      <LeaveBy drop={drop} timeZone={timeZone} nowMs={nowMs} />
      <div>
        <p className="font-medium">{drop.company.name}</p>
        <Tooltip>
          <TooltipTrigger render={<p />} className="w-fit text-sm text-muted-foreground underline decoration-dotted underline-offset-2">
            {drop.addressLabelSnapshot}
          </TooltipTrigger>
          <TooltipContent>{addressLine(drop)}</TooltipContent>
        </Tooltip>
        <p className="num text-xs text-muted-foreground">{dropSize(drop)}</p>
      </div>

      {drop.status === "DELIVERED" ? (
        <div className="flex flex-col gap-1.5 border-t pt-2 text-sm">
          <p className="flex flex-wrap items-center gap-2">
            Delivered <span className="num">{drop.deliveredAt ? formatBusinessTime(drop.deliveredAt, timeZone) : "—"}</span>
            {drop.onTime ? (
              <StatusBadge kind="onTime" value="ON_TIME" size="sm" />
            ) : (
              <StatusBadge kind="onTime" value="LATE" size="sm" label={`Late by ${formatDuration(lateMs)}`} />
            )}
          </p>
          {drop.deliveryNote && <p className="line-clamp-2 text-muted-foreground">&ldquo;{drop.deliveryNote}&rdquo;</p>}
          {drop.photoUrl && props.canViewProof && (
            <Button variant="link" size="sm" className="h-auto w-fit p-0" onClick={(e) => { e.stopPropagation(); props.onViewPhoto(drop); }}>
              <Camera data-icon="inline-start" /> View photo
            </Button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-2 border-t pt-2" onClick={(e) => e.stopPropagation()}>
          <DriverSelect
            drop={drop}
            drivers={props.drivers}
            defaultDriverId={props.defaultDriverId}
            canAssign={props.canAssign}
            pending={pending}
            onAssign={(driverId) => props.onAssign(drop, driverId)}
          />
          {drop.status === "DISPATCH_READY" && canAdvance && (
            <Tooltip>
              <TooltipTrigger render={<span className="block" tabIndex={blocker ? 0 : -1} />}>
                <Button className={cn("h-11 w-full", blocker && "pointer-events-none")} disabled={Boolean(blocker) || pending} onClick={() => props.onOutForDelivery(drop)}>
                  <Truck data-icon="inline-start" /> Mark out for delivery
                </Button>
              </TooltipTrigger>
              {blocker && <TooltipContent>{blocker}</TooltipContent>}
            </Tooltip>
          )}
          {blocker && drop.status === "DISPATCH_READY" && canAdvance && <p className="text-xs text-warning">{blocker}</p>}
        </div>
      )}
    </article>
  );
}
