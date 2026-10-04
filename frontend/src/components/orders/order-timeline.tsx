"use client";

import { Check } from "lucide-react";
import { Panel } from "@/components/app/panel";
import { useBusinessClock } from "@/hooks/use-business-clock";
import { isFieldChange, type OrderDetail, type OrderEvent, type OrderEventType } from "@/lib/api";
import { formatBusinessDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

const HAPPY_PATH: { type: OrderEventType; label: string }[] = [
  { type: "ORDER_CREATED", label: "Draft" },
  { type: "ORDER_PLACED", label: "Placed" },
  { type: "ORDER_CONFIRMED", label: "Confirmed" },
  { type: "KITCHEN_STARTED", label: "Kitchen started" },
  { type: "KITCHEN_READY", label: "Kitchen ready" },
  { type: "DISPATCH_READY", label: "Dispatch ready" },
  { type: "OUT_FOR_DELIVERY", label: "Out for delivery" },
  { type: "DELIVERED", label: "Delivered" },
];

export const EVENT_LABEL: Record<OrderEventType, string> = {
  ORDER_CREATED: "Created",
  ORDER_PLACED: "Placed",
  ORDER_CONFIRMED: "Confirmed",
  ORDER_REJECTED: "Rejected",
  ORDER_CANCELLED: "Cancelled",
  DELIVERY_DETAILS_CHANGED: "Delivery details changed",
  KITCHEN_STARTED: "Kitchen started",
  KITCHEN_READY: "Kitchen ready",
  DISPATCH_READY: "Dispatch ready",
  OUT_FOR_DELIVERY: "Out for delivery",
  DELIVERED: "Delivered",
};

const FIELD_LABEL: Record<string, string> = {
  deliveryAddressId: "Address",
  deliveryAt: "Delivery time",
  packagingTypeId: "Packaging",
};

type Props = {
  order: OrderDetail;
  /** Resolves address/packaging ids in change metadata to names when known. */
  nameFor?: (field: string, id: string) => string | undefined;
};

export function OrderTimeline({ order, nameFor }: Props) {
  const { timeZone } = useBusinessClock();
  const lastOf = (type: OrderEventType) => [...order.events].reverse().find((event) => event.type === type);
  const done = HAPPY_PATH.map((step) => lastOf(step.type));
  const terminal = order.status === "CANCELLED" || order.status === "REJECTED";
  const currentIndex = terminal ? -1 : done.findIndex((event) => !event);

  const describeValue = (field: string, value: string | null) => {
    if (value === null) return "none";
    if (field === "deliveryAt") return formatBusinessDateTime(value, timeZone);
    return nameFor?.(field, value) ?? "another option";
  };

  return (
    <Panel title="Timeline">
      <ol className="flex flex-col">
        {HAPPY_PATH.map((step, index) => {
          const event = done[index];
          const current = index === currentIndex;
          return (
            <li key={step.type} className="relative flex gap-3 pb-4 last:pb-0">
              {index < HAPPY_PATH.length - 1 && (
                <span aria-hidden className={cn("absolute top-6 left-[11px] h-[calc(100%-1.25rem)] w-px", event ? "bg-success/40" : "bg-border")} />
              )}
              <span
                className={cn(
                  "z-10 grid size-6 shrink-0 place-items-center rounded-full border text-xs",
                  event ? "border-success/30 bg-success-soft text-success" : current ? "border-primary bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                )}
              >
                {event ? <Check className="size-3.5" /> : index + 1}
              </span>
              <div className={cn("min-w-0 pt-0.5", !event && !current && "text-muted-foreground")}>
                <p className={cn("text-sm", (event || current) && "font-medium")}>{step.label}</p>
                {event && (
                  <p className="text-xs text-muted-foreground">
                    <span className="num">{formatBusinessDateTime(event.occurredAt, timeZone)}</span>
                    {event.actor && ` · ${event.actor.name}`}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
      {terminal && (
        <p className="mt-4 rounded-md border bg-neutral-soft px-3 py-2 text-sm text-neutral">
          This order was {order.status === "CANCELLED" ? "cancelled" : "rejected"}; later steps will not happen.
          {order.rejectionReason && ` Reason: ${order.rejectionReason}`}
        </p>
      )}

      <h3 className="label-caps mt-6 mb-2 text-muted-foreground">All events</h3>
      <ul className="divide-y rounded-md border">
        {order.events.map((event: OrderEvent) => (
          <li key={event.id} className="px-3 py-2 text-sm">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="font-medium">{EVENT_LABEL[event.type]}</span>
              <span className="num text-xs text-muted-foreground">
                {formatBusinessDateTime(event.occurredAt, timeZone)}
                {event.actor && ` · ${event.actor.name}`}
              </span>
            </div>
            {event.message && <p className="text-muted-foreground">{event.message}</p>}
            {event.metadata &&
              Object.entries(event.metadata).map(([field, change]) =>
                isFieldChange(change) ? (
                  <p key={field} className="text-xs">
                    <span className="text-muted-foreground">{FIELD_LABEL[field] ?? field}:</span> {describeValue(field, change.from)} →{" "}
                    <span className="font-medium">{describeValue(field, change.to)}</span>
                  </p>
                ) : null,
              )}
          </li>
        ))}
      </ul>
    </Panel>
  );
}
