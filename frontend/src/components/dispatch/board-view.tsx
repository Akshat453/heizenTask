"use client";

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type KeyboardCoordinateGetter,
} from "@dnd-kit/core";
import { ChefHat, CircleCheck, GripVertical, PackageCheck, Truck } from "lucide-react";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import type { DispatchDrop, OrderListItem } from "@/lib/api";
import { formatBusinessTime, formatCount } from "@/lib/format";
import { cn } from "@/lib/utils";
import { DropCard, type DropCardProps } from "./drop-card";
import { outForDeliveryBlocker, type dropColumns } from "./dispatch-model";

const READY = "ready";
const OUT = "out";

type CardShared = Omit<DropCardProps, "drop" | "defaultDriverId">;
type Props = {
  columns: ReturnType<typeof dropColumns>;
  waiting: OrderListItem[] | null;
  card: CardShared;
  defaultDriverFor: (drop: DispatchDrop) => string | null;
  timeZone: string;
  /** Pauses auto-refresh while a drag is in progress. */
  onDraggingChange: (dragging: boolean) => void;
};

type ColumnMode = "normal" | "target" | "dimmed";

function Column({ id, icon, title, subtitle, count, mode, children }: {
  id?: string; icon: ReactNode; title: string; subtitle?: string; count: number; mode: ColumnMode; children: ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: id ?? `static-${title}`, disabled: !id });
  return (
    <section
      ref={setNodeRef}
      aria-label={title}
      className={cn(
        "flex min-w-0 flex-col gap-3 rounded-xl p-2 transition-colors",
        mode === "target" && "bg-primary/5 outline-2 outline-primary outline-dashed",
        mode === "target" && isOver && "bg-primary/10 outline-solid",
        mode === "dimmed" && "cursor-not-allowed opacity-50",
      )}
    >
      <div>
        <h2 className="flex items-center gap-2 font-semibold">
          {icon} {title} <span className="num rounded-md bg-muted px-1.5 text-sm">{formatCount(count)}</span>
        </h2>
        {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

/** A ready drop with a drag handle: the handle is the pointer, touch and keyboard activator. */
function DraggableDrop(props: DropCardProps) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, isDragging } = useDraggable({ id: props.drop.id });
  return (
    <div
      ref={setNodeRef}
      style={transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined}
      className={cn("relative", isDragging && "z-50")}
    >
      <DropCard
        {...props}
        className={cn(isDragging && "rotate-1 shadow-soft ring-2 ring-primary")}
        dragHandle={
          <button
            type="button"
            ref={setActivatorNodeRef}
            {...listeners}
            {...attributes}
            aria-label={`Move ${props.drop.company.name} ${formatBusinessTime(props.drop.scheduledDeliveryAt, props.timeZone)} drop`}
            onClick={(e) => e.stopPropagation()}
            className="grid size-9 cursor-grab touch-none place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none active:cursor-grabbing"
          >
            <GripVertical className="size-4" />
          </button>
        }
      />
    </div>
  );
}

/** Arrow keys jump between "Ready to leave" and the only valid target, "Out for delivery". */
const coordinateGetter: KeyboardCoordinateGetter = (event, { context: { droppableRects, collisionRect } }) => {
  const target = ["ArrowRight", "ArrowDown"].includes(event.code) ? OUT : ["ArrowLeft", "ArrowUp"].includes(event.code) ? READY : null;
  const rect = target ? droppableRects.get(target) : undefined;
  if (!rect || !collisionRect) return undefined;
  event.preventDefault();
  return { x: rect.left + (rect.width - collisionRect.width) / 2, y: rect.top + 48 };
};

const empty = (text: string) => <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">{text}</p>;

/**
 * Workflow board. Drag and drop is a shortcut for the same server-validated
 * transition as the "Mark out for delivery" button, which stays the primary path.
 */
export function BoardView({ columns, waiting, card, defaultDriverFor, timeZone, onDraggingChange }: Props) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter, keyboardCodes: { start: ["Space"], cancel: ["Escape"], end: ["Space"] } }),
  );
  const findDrop = (id: string | number | undefined) => columns.ready.find((d) => d.id === id);
  const label = (id: string | number) => {
    const drop = findDrop(id);
    return drop ? `the ${formatBusinessTime(drop.scheduledDeliveryAt, timeZone)} drop for ${drop.company.name}` : "the drop";
  };
  const announcements: Announcements = {
    onDragStart: ({ active }) => `Picked up ${label(active.id)}. Press the right arrow to move it over Out for delivery, Space to drop, Escape to cancel.`,
    onDragOver: ({ active, over }) =>
      over?.id === OUT ? `${label(active.id)} is over Out for delivery. Press Space to mark it out for delivery.` : `${label(active.id)} is back over Ready to leave.`,
    onDragEnd: ({ active, over }) =>
      over?.id === OUT ? `Dropped ${label(active.id)} on Out for delivery.` : `${label(active.id)} stays in Ready to leave.`,
    onDragCancel: ({ active }) => `Move cancelled. ${label(active.id)} stays in Ready to leave.`,
  };

  const finish = () => {
    setActiveId(null);
    onDraggingChange(false);
  };
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    finish();
    if (over?.id !== OUT) return;
    const drop = findDrop(active.id);
    if (!drop) return;
    const blocker = outForDeliveryBlocker(drop);
    if (blocker) toast.error(blocker); // the card snaps back
    else card.onOutForDelivery(drop);
  };

  const dragging = activeId !== null;
  const mode = (id: string): ColumnMode => (!dragging ? "normal" : id === OUT ? "target" : id === READY ? "normal" : "dimmed");
  const renderStatic = (drops: DispatchDrop[], text: string) =>
    drops.length === 0 ? empty(text) : drops.map((drop) => <DropCard key={drop.id} {...card} drop={drop} defaultDriverId={defaultDriverFor(drop)} />);

  return (
    <DndContext
      sensors={sensors}
      accessibility={{
        announcements,
        screenReaderInstructions: {
          draggable: "To move a ready drop, press Space to pick it up, the right arrow to move it over Out for delivery, then Space to drop or Escape to cancel.",
        },
      }}
      onDragStart={({ active }) => {
        setActiveId(String(active.id));
        onDraggingChange(true);
      }}
      onDragEnd={onDragEnd}
      onDragCancel={finish}
    >
      <div className={cn("grid gap-3 md:grid-cols-2", waiting ? "xl:grid-cols-4" : "xl:grid-cols-3")}>
        {waiting && (
          <Column icon={<ChefHat className="size-4 text-neutral" />} title="Waiting on kitchen" subtitle="Orders still being cooked. They become a drop when ready." count={waiting.length} mode={mode("waiting")}>
            {waiting.length === 0
              ? empty("Every confirmed order is kitchen-ready.")
              : waiting.map((order) => (
                  <Link key={order.id} href={`/orders/${order.id}`} className="flex flex-col gap-1 rounded-lg border bg-card p-3 text-sm hover:border-primary/40">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="num text-lg font-semibold">{formatBusinessTime(order.deliveryAt, timeZone)}</span>
                      <span className="num text-xs text-muted-foreground">{order.orderNumber}</span>
                    </span>
                    <span className="font-medium">{order.company.name}</span>
                    <span className="text-muted-foreground">
                      {order.deliveryAddressLabelSnapshot} · {order.kitchenStartedAt ? "cooking" : "not started"}
                    </span>
                  </Link>
                ))}
          </Column>
        )}
        <Column id={READY} icon={<PackageCheck className="size-4 text-progress" />} title="Ready to leave" count={columns.ready.length} mode={mode(READY)}>
          {columns.ready.length === 0
            ? empty("No drops are waiting to leave.")
            : columns.ready.map((drop) =>
                card.canAdvance ? (
                  <DraggableDrop key={drop.id} {...card} drop={drop} defaultDriverId={defaultDriverFor(drop)} />
                ) : (
                  <DropCard key={drop.id} {...card} drop={drop} defaultDriverId={defaultDriverFor(drop)} />
                ),
              )}
        </Column>
        <Column id={OUT} icon={<Truck className="size-4 text-info" />} title="Out for delivery" count={columns.out.length} mode={mode(OUT)}>
          {renderStatic(columns.out, dragging ? "Drop here to mark out for delivery." : "Nothing on the road.")}
        </Column>
        <Column icon={<CircleCheck className="size-4 text-success" />} title="Delivered" subtitle="Only the driver can deliver." count={columns.delivered.length} mode={mode("delivered")}>
          {renderStatic(columns.delivered, "Nothing delivered yet.")}
        </Column>
      </div>
    </DndContext>
  );
}
