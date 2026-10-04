"use client";

import { ChevronDown, ChevronRight, CircleCheck, Loader, Circle } from "lucide-react";
import { useState, type ReactNode } from "react";
import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { Button } from "@/components/ui/button";
import type { KitchenBoardUnit } from "@/lib/api";
import { formatCount } from "@/lib/format";
import { cn } from "@/lib/utils";
import { splitColumns } from "./board-model";
import { useForceComplete, useUnitAction } from "./queries";
import { UnitCard } from "./unit-card";
import { VirtualColumn } from "./virtual-column";

type Props = {
  date: string;
  /** Filtered units to show. */
  units: KitchenBoardUnit[];
  /** All units of the day (for force-complete counts). */
  allUnits: KitchenBoardUnit[];
  timeZone: string;
  nowMs: number;
  showStation: boolean;
  canUpdate: boolean;
  canForce: boolean;
  columnHeight: string;
};

function ColumnHeader({ icon, title, count, action }: { icon: ReactNode; title: string; count: number; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 pb-2">
      <h2 className="flex items-center gap-2 text-[1em] font-semibold">
        {icon} {title} <span className="num rounded-md bg-muted px-1.5 text-[0.875em]">{formatCount(count)}</span>
      </h2>
      {action}
    </div>
  );
}

export function ByUnitView({ date, units, allUnits, timeZone, nowMs, showStation, canUpdate, canForce, columnHeight }: Props) {
  const [showDone, setShowDone] = useState(false);
  const [forcing, setForcing] = useState<KitchenBoardUnit | null>(null);
  const action = useUnitAction(date);
  const force = useForceComplete(date);
  const { notStarted, inProgress, done } = splitColumns(units);
  const pendingId = action.isPending ? action.variables?.unit.id : undefined;

  const card = (unit: KitchenBoardUnit) => (
    <UnitCard
      unit={unit}
      timeZone={timeZone}
      nowMs={nowMs}
      showStation={showStation}
      canUpdate={canUpdate}
      canForce={canForce}
      pending={pendingId === unit.id}
      onAction={(u, a) => action.mutate({ unit: u, action: a })}
      onForce={setForcing}
    />
  );
  const emptyText = (text: string) => <p className="rounded-lg border border-dashed p-6 text-center text-[0.875em] text-muted-foreground">{text}</p>;
  const remainingInOrder = forcing ? allUnits.filter((u) => u.orderId === forcing.orderId && u.prepState !== "DONE").length : 0;

  return (
    <div className={cn("grid gap-4", showDone ? "lg:grid-cols-3" : "lg:grid-cols-[1fr_1fr_14rem]")}>
      <section aria-label="Not started" className="min-w-0">
        <ColumnHeader icon={<Circle className="size-4 text-neutral" />} title="Not started" count={notStarted.length} />
        <VirtualColumn units={notStarted} renderCard={card} className={columnHeight} empty={emptyText("Nothing waiting to start.")} />
      </section>
      <section aria-label="In progress" className="min-w-0">
        <ColumnHeader icon={<Loader className="size-4 text-progress" />} title="In progress" count={inProgress.length} />
        <VirtualColumn units={inProgress} renderCard={card} className={columnHeight} empty={emptyText("No units in progress.")} />
      </section>
      <section aria-label="Done" className="min-w-0">
        <ColumnHeader
          icon={<CircleCheck className="size-4 text-success" />}
          title="Done"
          count={done.length}
          action={
            <Button variant="ghost" size="sm" aria-expanded={showDone} onClick={() => setShowDone((v) => !v)}>
              {showDone ? <ChevronDown data-icon="inline-start" /> : <ChevronRight data-icon="inline-start" />}
              {showDone ? "Collapse" : "Show"}
            </Button>
          }
        />
        {showDone ? (
          <VirtualColumn units={done} renderCard={card} className={columnHeight} empty={emptyText("Nothing finished yet.")} />
        ) : (
          emptyText(`${formatCount(done.length)} unit${done.length === 1 ? "" : "s"} done.`)
        )}
      </section>

      <ConfirmDialog
        open={Boolean(forcing)}
        onOpenChange={(open) => !open && setForcing(null)}
        title={`Force complete ${forcing?.orderNumber ?? "order"}?`}
        description={`${remainingInOrder} unfinished unit${remainingInOrder === 1 ? "" : "s"} in this order will be marked done now, and the order becomes ready for dispatch. Use it only when the food is actually ready.`}
        confirmLabel="Force complete order"
        pending={force.isPending}
        onConfirm={() => forcing && force.mutate(forcing.orderId, { onSettled: () => setForcing(null) })}
      />
    </div>
  );
}
