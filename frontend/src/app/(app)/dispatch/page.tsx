"use client";

import { useQueries } from "@tanstack/react-query";
import { Truck } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { DataTablePagination } from "@/components/app/data-table-pagination";
import { EmptyState } from "@/components/app/empty-state";
import { ErrorState } from "@/components/app/error-state";
import { PageHeader } from "@/components/app/page-header";
import { useAuth } from "@/components/auth/auth-provider";
import { BoardView } from "@/components/dispatch/board-view";
import { DispatchHeader } from "@/components/dispatch/dispatch-header";
import { dispatchTotals, dropColumns, waitingOrders } from "@/components/dispatch/dispatch-model";
import { DropSheet } from "@/components/dispatch/drop-sheet";
import { useDayOrders, useDispatchMutation, useDrivers, useDrops, useOutForDelivery } from "@/components/dispatch/queries";
import { DispatchSummary } from "@/components/dispatch/summary-strip";
import { TableView } from "@/components/dispatch/table-view";
import { useDispatchParams } from "@/components/dispatch/use-dispatch-params";
import { Skeleton } from "@/components/ui/skeleton";
import { useBusinessClock } from "@/hooks/use-business-clock";
import { companiesApi, dispatchApi, type DispatchDrop } from "@/lib/api";
import { describeError, isApiError } from "@/lib/api-client";
import { P } from "@/lib/permissions";

export default function DispatchPage() {
  const { can } = useAuth();
  const { businessDate: today, timeZone, nowMs } = useBusinessClock();
  const dispatch = useDispatchParams(today);
  const { params, setParams, date, query, dayQuery } = dispatch;
  const [dragging, setDragging] = useState(false);
  const drops = useDrops(query, dragging);
  const day = useDrops(dayQuery, dragging);
  const dayOrders = useDayOrders(date, dragging);
  const drivers = useDrivers();
  const [rebuildOpen, setRebuildOpen] = useState(false);

  const visible = useMemo(() => drops.data?.data ?? [], [drops.data]);
  const columns = useMemo(() => dropColumns(visible), [visible]);
  const filtered = Boolean(params.q || params.driver);
  const waiting = useMemo(
    () => (dayOrders.data && !params.driver ? waitingOrders(dayOrders.data.data, params.q) : null),
    [dayOrders.data, params.driver, params.q],
  );
  const totals = dispatchTotals(day.data?.data ?? [], dayOrders.data ? waitingOrders(dayOrders.data.data, "").length : 0);

  // Company default drivers, to tag "Default" in the driver picker.
  const companyIds = [...new Set(visible.map((d) => d.companyId))];
  const companies = useQueries({
    queries: companyIds.map((id) => ({
      queryKey: ["companies", "detail", id],
      queryFn: () => companiesApi.get(id),
      enabled: can(P.companiesRead),
      staleTime: 5 * 60_000,
    })),
  });
  const defaults = new Map(companies.flatMap((q) => (q.data ? [[q.data.id, q.data.defaultDriver?.id ?? null] as const] : [])));

  const assign = useDispatchMutation(({ drop, driverId }: { drop: DispatchDrop; driverId: string }) => dispatchApi.assignDriver(drop.id, driverId), "Driver assigned");
  const advance = useOutForDelivery();
  const rebuild = useDispatchMutation(() => dispatchApi.reconcile(), "Drops rebuilt");

  const viewPhoto = async (drop: DispatchDrop) => {
    // Open the tab synchronously (popup blockers), then point it at the short-lived URL.
    const tab = window.open("", "_blank");
    if (tab) tab.opener = null;
    try {
      const { url } = await dispatchApi.proofUrl(drop.id); // never stored
      if (tab) tab.location.href = url;
      else window.open(url, "_blank", "noopener");
    } catch (error) {
      tab?.close();
      toast.error(
        isApiError(error, 410)
          ? "Photo unavailable: this delivery's photo can no longer be shown."
          : isApiError(error, 503)
            ? "Photo viewing isn't available right now."
            : describeError(error, "Could not open the photo."),
      );
    }
  };

  const selected = params.drop ? visible.find((d) => d.id === params.drop) : undefined;
  const card = {
    timeZone,
    nowMs,
    drivers: drivers.data ?? [],
    canAssign: can(P.dispatchAssignDriver),
    canAdvance: can(P.dispatchUpdate),
    canViewProof: can(P.dispatchRead),
    pending: assign.isPending || advance.isPending,
    onAssign: (drop: DispatchDrop, driverId: string) => assign.mutate({ drop, driverId }),
    onOutForDelivery: (drop: DispatchDrop) => advance.mutate(drop),
    onViewPhoto: (drop: DispatchDrop) => void viewPhoto(drop),
    onOpen: (drop: DispatchDrop) => void setParams({ drop: drop.id }),
  };
  const defaultDriverFor = (drop: DispatchDrop) => defaults.get(drop.companyId) ?? null;
  const pagination = drops.data?.pagination;

  return (
    <main className="flex flex-col gap-5 p-4 md:p-6">
      <PageHeader title="Dispatch" description="Drops group ready orders by company, address and exact delivery time." />
      <DispatchHeader {...dispatch} today={today} drivers={drivers.data ?? []} canRebuild={can(P.dispatchUpdate)} onRebuild={() => setRebuildOpen(true)} />
      <DispatchSummary totals={totals} showWaiting={Boolean(dayOrders.data)} />

      {drops.isLoading || !date ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4" aria-busy="true">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      ) : drops.error ? (
        <ErrorState error={drops.error} title="Could not load drops" onRetry={() => void drops.refetch()} />
      ) : visible.length === 0 && !waiting?.length ? (
        <EmptyState
          icon={Truck}
          title={filtered ? "No drops match" : "No drops for this day"}
          description={filtered ? "Clear the search or driver filter." : "Drops appear once every order for a company, address and time is kitchen-ready. Rebuild drops if you expected some."}
        />
      ) : params.view === "table" ? (
        <TableView
          drops={visible}
          card={card}
          defaultDriverFor={defaultDriverFor}
          pagination={pagination}
          onPageChange={(page) => void setParams({ page: page === 1 ? null : page })}
          isLoading={drops.isFetching && !drops.data}
        />
      ) : (
        <>
          <BoardView columns={columns} waiting={waiting} card={card} defaultDriverFor={defaultDriverFor} timeZone={timeZone} onDraggingChange={setDragging} />
          {pagination && pagination.totalPages > 1 && (
            <div className="rounded-lg border bg-card">
              <DataTablePagination pagination={pagination} onPageChange={(page) => void setParams({ page: page === 1 ? null : page })} />
            </div>
          )}
        </>
      )}

      {selected && <DropSheet drop={selected} timeZone={timeZone} onClose={() => void setParams({ drop: null })} onViewPhoto={(d) => void viewPhoto(d)} />}
      <ConfirmDialog
        open={rebuildOpen}
        onOpenChange={setRebuildOpen}
        title="Rebuild drops?"
        description="Regroups ready orders by company, address and exact delivery time. Delivered and departed drops are never changed. Safe to run again."
        confirmLabel="Rebuild drops"
        pending={rebuild.isPending}
        onConfirm={() =>
          rebuild.mutate(undefined, {
            onSuccess: (result) => {
              if (result.failures.length) toast.warning(`${result.failures.length} group(s) could not be rebuilt; try again.`);
            },
            onSettled: () => setRebuildOpen(false),
          })
        }
      />
    </main>
  );
}
