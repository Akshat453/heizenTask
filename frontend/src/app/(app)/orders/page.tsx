"use client";

import { useQueries, useQuery } from "@tanstack/react-query";
import { CalendarClock, ClipboardList, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { DataTable } from "@/components/app/data-table";
import { DateRangeFilter } from "@/components/app/date-range-filter";
import { EmptyState } from "@/components/app/empty-state";
import { EntityCombobox } from "@/components/app/entity-combobox";
import { FilterBar, type ExtraChip } from "@/components/app/filter-bar";
import { PageHeader } from "@/components/app/page-header";
import { StatusBadge } from "@/components/app/status-badge";
import { useAuth } from "@/components/auth/auth-provider";
import { orderColumns } from "@/components/orders/order-columns";
import { ORDER_STATUSES, serializeRange, useOrderListParams } from "@/components/orders/order-list-params";
import { cutoffKey, orderKeys } from "@/components/orders/queries";
import { RunCutoffDialog } from "@/components/orders/run-cutoff-dialog";
import { Button } from "@/components/ui/button";
import { useBusinessClock } from "@/hooks/use-business-clock";
import { businessTimeApi, companiesApi, ordersApi, type CutoffInfo } from "@/lib/api";
import { formatBusinessDate, toIsoDate } from "@/lib/format";
import { P } from "@/lib/permissions";
import { STATUS } from "@/lib/status";

const STATUS_OPTIONS = ORDER_STATUSES.map((status) => ({
  value: status,
  label: STATUS.order[status].label,
  render: <StatusBadge kind="order" value={status} size="sm" />,
}));

export default function OrdersPage() {
  const router = useRouter();
  const { can } = useAuth();
  const { businessDate, timeZone, nowMs } = useBusinessClock();
  const { params, setParams, range, query, ready } = useOrderListParams(businessDate);
  const [cutoffOpen, setCutoffOpen] = useState(false);

  const orders = useQuery({
    queryKey: orderKeys.list(query),
    queryFn: () => ordersApi.list(query),
    enabled: ready,
    placeholderData: (previous) => previous,
  });

  const company = useQuery({
    queryKey: ["companies", "detail", params.company],
    queryFn: () => companiesApi.get(params.company!),
    enabled: Boolean(params.company) && can(P.companiesRead),
    staleTime: 5 * 60_000,
  });

  // Cut-off state per delivery date on this page (backend rule; settings.read only).
  const canReadCutoffs = can(P.settingsRead);
  const pageDates = [...new Set((orders.data?.data ?? []).map((o) => toIsoDate(o.deliveryDate)))];
  const cutoffQueries = useQueries({
    queries: pageDates.map((date) => ({
      queryKey: cutoffKey(date),
      queryFn: () => businessTimeApi.cutoff(date),
      enabled: canReadCutoffs,
      staleTime: 60_000,
    })),
  });
  const cutoffs = canReadCutoffs
    ? Object.fromEntries(cutoffQueries.flatMap((q) => (q.data ? [[q.data.deliveryDate, q.data] as [string, CutoffInfo]] : [])))
    : undefined;

  const columns = orderColumns({ today: businessDate, timeZone, nowMs, cutoffs });

  const extraChips: ExtraChip[] = [];
  if (params.dates)
    extraChips.push({
      key: "dates",
      label:
        params.dates === "all"
          ? "Any delivery date"
          : `Delivery: ${range.from ? formatBusinessDate(range.from) : "…"} – ${range.to ? formatBusinessDate(range.to) : "…"}`,
      onRemove: () => void setParams({ dates: null, page: null }),
    });
  if (params.company)
    extraChips.push({
      key: "company",
      label: `Company: ${company.data?.name ?? "…"}`,
      onRemove: () => void setParams({ company: null, page: null }),
    });

  return (
    <main className="flex flex-col gap-6 p-4 md:p-6">
      <PageHeader
        title="Orders"
        description="Every employee meal order. Totals and statuses come from the server."
        actions={
          <>
            {can(P.ordersOverride) && (
              <Button variant="outline" onClick={() => setCutoffOpen(true)}>
                <CalendarClock data-icon="inline-start" />
                Run cut-off
              </Button>
            )}
            {can(P.ordersCreate) && (
              <Button render={<Link href="/orders/new" />} nativeButton={false}>
                <Plus data-icon="inline-start" />
                New order
              </Button>
            )}
          </>
        }
      />

      <DataTable
        columns={columns}
        data={orders.data?.data}
        pagination={orders.data?.pagination}
        onPageChange={(page) => void setParams({ page })}
        onPageSizeChange={(size) => void setParams({ size, page: null })}
        getRowId={(row) => row.id}
        onRowClick={(row) => router.push(`/orders/${row.id}`)}
        isLoading={orders.isLoading || !ready}
        error={orders.error}
        onRetry={() => void orders.refetch()}
        toolbar={
          <FilterBar
            searchKey="q"
            searchPlaceholder="Order #, employee or company"
            filters={[
              { key: "status", label: "Status", options: STATUS_OPTIONS },
              { key: "invoiced", label: "Invoiced", options: [{ value: "yes", label: "Invoiced" }] },
            ]}
            extraChips={extraChips}
            extra={
              <>
                <DateRangeFilter
                  value={range}
                  today={businessDate}
                  onChange={(next) => void setParams({ dates: serializeRange(next), page: null })}
                />
                {can(P.companiesRead) && (
                  <EntityCombobox
                    className="w-56"
                    label="Company"
                    placeholder="Any company"
                    queryKey="companies"
                    clearable
                    value={params.company ? { id: params.company, label: company.data?.name ?? "Company" } : null}
                    onChange={(item) => void setParams({ company: item?.id ?? null, page: null })}
                    search={async (term) =>
                      (await companiesApi.list({ search: term || undefined, pageSize: 10 })).data.map((c) => ({ id: c.id, label: c.name }))
                    }
                  />
                )}
              </>
            }
          />
        }
        empty={
          <EmptyState
            icon={ClipboardList}
            title="No orders match these filters"
            description="Widen the delivery dates or clear a filter."
            action={
              can(P.ordersCreate) ? (
                <Button render={<Link href="/orders/new" />} nativeButton={false}>
                  New order
                </Button>
              ) : undefined
            }
          />
        }
      />
      <RunCutoffDialog open={cutoffOpen} onOpenChange={setCutoffOpen} />
    </main>
  );
}
