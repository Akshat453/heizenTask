"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { ErrorState } from "@/components/app/error-state";
import { StatusBadge } from "@/components/app/status-badge";
import { useAuth } from "@/components/auth/auth-provider";
import { OrderActions } from "@/components/orders/order-actions";
import { CutoffChip, TodayPill } from "@/components/orders/order-columns";
import { OrderItemsCard } from "@/components/orders/order-items-card";
import { OrderRail } from "@/components/orders/order-rail";
import { OrderTimeline } from "@/components/orders/order-timeline";
import { useOrder } from "@/components/orders/queries";
import { useOrderContext } from "@/components/orders/use-order-context";
import { Skeleton } from "@/components/ui/skeleton";
import { useBusinessClock } from "@/hooks/use-business-clock";
import { referenceDataApi } from "@/lib/api";
import { formatBusinessDateTime, toIsoDate } from "@/lib/format";
import { P } from "@/lib/permissions";

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { can } = useAuth();
  const { businessDate, timeZone, nowMs } = useBusinessClock();
  const order = useOrder(id);
  const ctx = useOrderContext(order.data);
  const packagings = useQuery({
    queryKey: ["reference", "packaging"],
    queryFn: referenceDataApi.packagingTypes,
    enabled: can(P.catalogueRead),
    staleTime: 5 * 60_000,
  });

  if (order.isLoading) {
    return (
      <main className="flex flex-col gap-6 p-4 md:p-6" aria-busy="true">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-6 lg:grid-cols-12">
          <Skeleton className="h-96 lg:col-span-8" />
          <Skeleton className="h-96 lg:col-span-4" />
        </div>
      </main>
    );
  }
  if (order.error || !order.data) {
    return (
      <main className="p-4 md:p-6">
        <ErrorState error={order.error} title="Could not load this order" onRetry={() => void order.refetch()} />
      </main>
    );
  }

  const data = order.data;
  const created = data.events.find((event) => event.type === "ORDER_CREATED");
  const nameFor = (field: string, value: string) =>
    field === "deliveryAddressId"
      ? ctx.company.data?.addresses.find((a) => a.id === value)?.label
      : field === "packagingTypeId"
        ? packagings.data?.find((p) => p.id === value)?.name
        : undefined;

  return (
    <main className="flex flex-col gap-6 p-4 md:p-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="num text-2xl font-semibold tracking-tight">{data.orderNumber}</h1>
            <StatusBadge kind="order" value={data.status} />
            {(data.status === "DRAFT" || data.status === "PLACED") && (
              <CutoffChip cutoff={ctx.cutoff.data} nowMs={nowMs} timeZone={timeZone} />
            )}
            {toIsoDate(data.deliveryDate) === businessDate && <TodayPill />}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {data.employee.name} · {data.company.name} · created{" "}
            <span className="num">{formatBusinessDateTime(data.createdAt, timeZone)}</span>
            {created?.actor && ` by ${created.actor.name}`}
          </p>
        </div>
        <OrderActions order={data} ctx={ctx} />
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="flex min-w-0 flex-col gap-6 lg:col-span-8">
          <OrderItemsCard order={data} />
          <OrderTimeline order={data} nameFor={nameFor} />
        </div>
        <div className="flex min-w-0 flex-col gap-6 lg:col-span-4">
          <OrderRail order={data} ctx={ctx} />
        </div>
      </div>
    </main>
  );
}
