"use client";

import { TriangleAlert } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Panel } from "@/components/app/panel";
import { StatusBadge } from "@/components/app/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useBusinessClock } from "@/hooks/use-business-clock";
import type { OrderDetail } from "@/lib/api";
import { formatBusinessDate, formatBusinessDateTime, formatBusinessTime, formatDuration, formatMoney, toIsoDate } from "@/lib/format";
import type { OrderContext } from "./use-order-context";

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[7.5rem_1fr] gap-2 py-1.5 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0">{children}</dd>
    </div>
  );
}

const dash = <span className="text-muted-foreground">—</span>;

export function OrderRail({ order, ctx }: { order: OrderDetail; ctx: OrderContext }) {
  const { timeZone } = useBusinessClock();
  const drop = ctx.drop.data;
  const company = ctx.company.data;
  const employee = ctx.employee.data;
  const units = ctx.kitchen.data ?? [];
  const unfinished = units.find((unit) => unit.prepState !== "DONE");
  const address = [
    order.deliveryAddressLine1Snapshot,
    order.deliveryAddressLine2Snapshot,
    order.deliveryAddressCitySnapshot,
    order.deliveryAddressPostalCodeSnapshot,
  ]
    .filter(Boolean)
    .join(", ");

  const lateMs = drop?.deliveredAt ? new Date(drop.deliveredAt).getTime() - new Date(drop.scheduledDeliveryAt).getTime() : 0;

  return (
    <>
      <Panel title="Delivery">
        <dl>
          <Fact label="Date">
            <span className="num">{formatBusinessDate(toIsoDate(order.deliveryDate), { withYear: true })}</span>
          </Fact>
          <Fact label="Time">
            <span className="num">{formatBusinessTime(order.deliveryAt, timeZone)}</span>
          </Fact>
          <Fact label="Address">
            <span className="font-medium">{order.deliveryAddressLabelSnapshot}</span>
            <span className="block text-muted-foreground">{address}</span>
          </Fact>
          <Fact label="Packaging">{order.packagingNameSnapshot}</Fact>
          <Fact label="Instructions">{company?.driverInstructions || dash}</Fact>
          <Fact label="Drop">
            {!order.deliveryDropId ? (
              <StatusBadge kind="drop" value="WAITING_ON_KITCHEN" size="sm" />
            ) : drop ? (
              <span className="flex flex-col items-start gap-1">
                <StatusBadge kind="drop" value={drop.status} size="sm" />
                <span className="text-xs text-muted-foreground">Driver: {drop.driver?.name ?? "not assigned"}</span>
              </span>
            ) : ctx.drop.isLoading ? (
              <Skeleton className="h-5 w-24" />
            ) : (
              "Grouped into a drop"
            )}
          </Fact>
          {drop?.onTime !== null && drop?.onTime !== undefined && (
            <Fact label="Result">
              {drop.onTime ? (
                <StatusBadge kind="onTime" value="ON_TIME" size="sm" />
              ) : (
                <StatusBadge kind="onTime" value="LATE" size="sm" label={`Late by ${formatDuration(lateMs)}`} />
              )}
            </Fact>
          )}
        </dl>
      </Panel>

      <Panel title="Customer">
        <dl>
          <Fact label="Employee">
            {order.employee.name}
            {order.employee.email && <span className="block text-xs text-muted-foreground">{order.employee.email}</span>}
          </Fact>
          <Fact label="Company">
            <Link href={`/companies/${order.company.id}/edit`} className="text-primary hover:underline">
              {order.company.name}
            </Link>
          </Fact>
          <Fact label="Price tier">{company ? (company.priceTier?.name ?? "Default tier") : dash}</Fact>
        </dl>
        {employee && (employee.allergens.length > 0 || employee.dietaryTags.length > 0) && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {employee.allergens.map(({ allergen }) => (
              <span key={allergen.id} className="inline-flex items-center gap-1 rounded-md border border-warning/20 bg-warning-soft px-1.5 py-0.5 text-xs text-warning">
                <TriangleAlert className="size-3" aria-hidden /> {allergen.name}
              </span>
            ))}
            {employee.dietaryTags.map(({ dietaryTag }) => (
              <span key={dietaryTag.id} className="rounded-md border bg-secondary px-1.5 py-0.5 text-xs text-secondary-foreground">
                {dietaryTag.name}
              </span>
            ))}
          </div>
        )}
      </Panel>

      <Panel title="Kitchen">
        <dl>
          <Fact label="Ready by">
            {units[0] ? <span className="num">{formatBusinessTime(units[0].plannedKitchenReadyAt, timeZone)}</span> : dash}
          </Fact>
          <Fact label="Leaves by">
            {drop?.plannedDispatchReadyAt ? <span className="num">{formatBusinessTime(drop.plannedDispatchReadyAt, timeZone)}</span> : dash}
          </Fact>
          <Fact label="Started">{order.kitchenStartedAt ? <span className="num">{formatBusinessDateTime(order.kitchenStartedAt, timeZone)}</span> : dash}</Fact>
          <Fact label="Ready">{order.kitchenReadyAt ? <span className="num">{formatBusinessDateTime(order.kitchenReadyAt, timeZone)}</span> : dash}</Fact>
          {units.length > 0 && (
            <Fact label="Timing">
              <StatusBadge kind="timing" value={unfinished ? unfinished.timingState : "COMPLETE"} size="sm" />
            </Fact>
          )}
        </dl>
      </Panel>

      <Panel title="Billing">
        <dl>
          <Fact label="Billable">
            {order.billableTotalCents !== null ? (
              <span className="num font-medium">{formatMoney(order.billableTotalCents)}</span>
            ) : (
              <span className="text-muted-foreground">Not yet (set at cut-off confirmation)</span>
            )}
          </Fact>
          <Fact label="Invoice">
            {order.invoiceOrder ? (
              <Link href={`/billing/invoices/${order.invoiceOrder.invoiceId}`} className="num text-primary hover:underline">
                {ctx.invoice.data?.invoiceNumber ?? "View invoice"}
              </Link>
            ) : (
              <StatusBadge kind="invoice" value="NOT_INVOICED" size="sm" />
            )}
          </Fact>
        </dl>
      </Panel>
    </>
  );
}
