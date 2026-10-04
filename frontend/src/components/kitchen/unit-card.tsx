"use client";

import { Check, EllipsisVertical, Play } from "lucide-react";
import { memo } from "react";
import { StatusBadge } from "@/components/app/status-badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { KitchenBoardUnit } from "@/lib/api";
import { formatBusinessTime, formatDuration } from "@/lib/format";
import { cn } from "@/lib/utils";
import { optionText } from "./board-model";

type Props = {
  unit: KitchenBoardUnit;
  timeZone: string;
  nowMs: number;
  showStation: boolean;
  canUpdate: boolean;
  canForce: boolean;
  pending: boolean;
  onAction: (unit: KitchenBoardUnit, action: "start" | "done") => void;
  onForce: (unit: KitchenBoardUnit) => void;
};

const STRIPE = { LATE: "bg-danger", AT_RISK: "bg-warning", ON_TRACK: "bg-transparent", COMPLETE: "bg-transparent" } as const;

/** Timing text from the API's state and planned time (minutes are display arithmetic only). */
function timingLabel(unit: KitchenBoardUnit, timeZone: string, nowMs: number): string {
  const deadline = new Date(unit.plannedKitchenReadyAt).getTime();
  if (unit.prepState === "DONE") return unit.doneAt ? `Done ${formatBusinessTime(unit.doneAt, timeZone)}` : "Done";
  if (unit.timingState === "LATE") return `Late by ${formatDuration(nowMs - deadline)}`;
  if (unit.timingState === "AT_RISK") return `At risk · ${formatDuration(deadline - nowMs)} left`;
  return `Ready by ${formatBusinessTime(unit.plannedKitchenReadyAt, timeZone)}`;
}

export const UnitCard = memo(function UnitCard({ unit, timeZone, nowMs, showStation, canUpdate, canForce, pending, onAction, onForce }: Props) {
  const done = unit.prepState === "DONE";
  return (
    <article
      className={cn("overflow-hidden rounded-lg border bg-card", unit.timingState === "LATE" && !done && "border-danger/40")}
      aria-label={`${unit.dishNameSnapshot} times ${unit.quantity}, order ${unit.orderNumber}`}
    >
      <div aria-hidden className={cn("h-1", done ? "bg-transparent" : STRIPE[unit.timingState])} />
      <div className="flex flex-col gap-2.5 p-3">
        <div className="flex items-start justify-between gap-2">
          <StatusBadge kind="timing" value={done ? "COMPLETE" : unit.timingState} label={timingLabel(unit, timeZone, nowMs)} />
          {canForce && !done && (
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label="More actions" />}>
                <EllipsisVertical />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onForce(unit)}>Force complete order</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="text-[1em] leading-snug font-semibold">{unit.dishNameSnapshot}</h3>
          <span className="num shrink-0 text-[1.5em] leading-none font-semibold">×{unit.quantity}</span>
        </div>
        {unit.options.length > 0 && (
          <ul className="flex flex-wrap gap-1">
            {optionText(unit).map((text) => (
              <li key={text} className="rounded-md border bg-secondary px-1.5 py-0.5 text-[0.8125em] text-secondary-foreground">
                {text}
              </li>
            ))}
          </ul>
        )}
        <p className="text-[0.8125em] text-muted-foreground">
          <span className="num text-foreground">{unit.orderNumber}</span> · {unit.companyName} · delivers{" "}
          <span className="num">{formatBusinessTime(unit.deliveryAt, timeZone)}</span>
          {showStation && ` · ${unit.stationNameSnapshot}`}
        </p>
        {canUpdate && !done && (
          <div className="flex flex-col gap-1.5 pt-1">
            {unit.prepState === "NOT_STARTED" ? (
              <>
                <Button className="h-12 w-full text-[1em]" disabled={pending} onClick={() => onAction(unit, "start")}>
                  <Play data-icon="inline-start" /> Start
                </Button>
                <Button variant="outline" className="h-12 w-full text-[1em]" disabled={pending} onClick={() => onAction(unit, "done")}>
                  <Check data-icon="inline-start" /> Done
                  <span className="text-[0.75em] font-normal text-muted-foreground">also records the start</span>
                </Button>
              </>
            ) : (
              <Button className="h-12 w-full text-[1em]" disabled={pending} onClick={() => onAction(unit, "done")}>
                <Check data-icon="inline-start" /> Done
              </Button>
            )}
          </div>
        )}
      </div>
    </article>
  );
});
