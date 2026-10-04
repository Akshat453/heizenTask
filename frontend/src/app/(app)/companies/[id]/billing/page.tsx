"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef, RowSelectionState } from "@tanstack/react-table";
import { Info, Receipt } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { parseAsInteger, useQueryStates } from "nuqs";
import { useState } from "react";
import { toast } from "sonner";
import { AccessDenied } from "@/components/app/access-denied";
import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { DataTable } from "@/components/app/data-table";
import { EmptyState } from "@/components/app/empty-state";
import { FormErrorAlert } from "@/components/app/form-error-alert";
import { MoneyBreakdown } from "@/components/app/money-breakdown";
import { PageHeader } from "@/components/app/page-header";
import { StatusBadge } from "@/components/app/status-badge";
import { useAuth } from "@/components/auth/auth-provider";
import { billingKeys, useUninvoicedSummary } from "@/components/billing/queries";
import { useCompany } from "@/components/companies/queries";
import { Button } from "@/components/ui/button";
import { billingApi, type UninvoicedOrder } from "@/lib/api";
import { CONFLICT_MESSAGE, describeError, isApiError } from "@/lib/api-client";
import { formatBusinessDate, formatCount, formatMoney } from "@/lib/format";
import { P } from "@/lib/permissions";

const columns: ColumnDef<UninvoicedOrder, unknown>[] = [
  { id: "number", header: "Order #", cell: ({ row }) => <Link href={`/orders/${row.original.id}`} onClick={(e) => e.stopPropagation()} className="font-mono font-medium underline-offset-4 hover:underline">{row.original.orderNumber}</Link> },
  { id: "date", header: "Delivery date", cell: ({ row }) => formatBusinessDate(row.original.deliveryDate, { withYear: true }) },
  { id: "employee", header: "Employee", cell: ({ row }) => row.original.employee.name },
  {
    id: "status",
    header: "Status",
    cell: ({ row }) =>
      row.original.status === "CANCELLED" ? (
        <StatusBadge kind="order" value="CANCELLED" size="sm" label="Cancelled after confirmation · still billable" />
      ) : (
        <StatusBadge kind="order" value={row.original.status} size="sm" />
      ),
  },
  { id: "amount", header: "Billable amount", meta: { align: "right" }, cell: ({ row }) => <span className="font-mono tabular-nums">{formatMoney(row.original.billableTotalCents)}</span> },
];

export default function CompanyBillingPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { can } = useAuth();
  const company = useCompany(id);
  const summary = useUninvoicedSummary(id);
  const [params, setParams] = useQueryStates({ page: parseAsInteger.withDefault(1), size: parseAsInteger.withDefault(100) }, { history: "replace" });
  const query = { page: params.page, pageSize: params.size };
  const orders = useQuery({ queryKey: billingKeys.uninvoiced(id, query), queryFn: () => billingApi.uninvoiced(id, query), placeholderData: (p) => p, enabled: can(P.billingRead) });
  // Selected rows survive paging; amounts are kept for the labelled estimate only.
  const [selected, setSelected] = useState<Record<string, UninvoicedOrder>>({});
  const [confirming, setConfirming] = useState(false);
  const rowSelection: RowSelectionState = Object.fromEntries(Object.keys(selected).map((k) => [k, true]));
  const picked = Object.values(selected);
  const estimateCents = picked.reduce((sum, o) => sum + o.billableTotalCents, 0);

  const create = useMutation({
    mutationFn: () => billingApi.createInvoice(id, Object.keys(selected)),
    onSuccess: (invoice) => {
      toast.success(`Invoice ${invoice.invoiceNumber} created`);
      setSelected({});
      setConfirming(false);
      router.push(`/billing/invoices/${invoice.id}`);
    },
    onError: (error) => {
      if (isApiError(error, 409)) {
        toast.error(/concurrent|already/i.test(error.message) ? CONFLICT_MESSAGE : error.message);
        setConfirming(false);
        setSelected({});
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: billingKeys.all });
      void queryClient.invalidateQueries({ queryKey: ["dashboards"] });
    },
  });

  if (!can(P.billingRead)) return <AccessDenied className="py-24" />;
  const name = company.data?.name ?? "Company";
  const canCreate = can(P.billingManage);

  return (
    <main className="flex flex-col gap-6 p-4 md:p-6">
      <PageHeader
        title={`${name} billing`}
        description={
          summary.data
            ? `${formatCount(summary.data.pagination.totalItems)} billable orders not invoiced · ${formatMoney(summary.data.totalUninvoicedCents)}`
            : "Billable orders not yet on an invoice."
        }
        actions={
          <Button variant="outline" render={<Link href={`/billing?tab=invoices&company=${id}`} />} nativeButton={false}>
            <Receipt data-icon="inline-start" /> Invoices for {name}
          </Button>
        }
      />
      <div className="flex gap-3 rounded-lg border bg-info-soft p-3 text-sm">
        <Info className="mt-0.5 size-4 shrink-0 text-info" aria-hidden />
        <p>
          Billable means the order has a billable amount, frozen when cut-off confirms it, not its current status. Orders cancelled after confirmation stay billable;
          orders cancelled before cut-off are never billable. Each invoice line copies the order&apos;s billable amount and the invoice total is their sum. An order can be on
          at most one invoice, and invoices are immutable.
        </p>
      </div>
      <DataTable
        columns={columns}
        data={orders.data?.data}
        pagination={orders.data?.pagination}
        onPageChange={(page) => void setParams({ page })}
        onPageSizeChange={(size) => void setParams({ size, page: null })}
        getRowId={(o) => o.id}
        rowSelection={canCreate ? rowSelection : undefined}
        onRowSelectionChange={
          canCreate
            ? (updater) => {
                const next = typeof updater === "function" ? updater(rowSelection) : updater;
                const onPage = new Map((orders.data?.data ?? []).map((o) => [o.id, o]));
                setSelected((prev) => {
                  const out: Record<string, UninvoicedOrder> = {};
                  for (const [key, on] of Object.entries(next)) {
                    const row = prev[key] ?? onPage.get(key);
                    if (on && row) out[key] = row;
                  }
                  return out;
                });
              }
            : undefined
        }
        isLoading={orders.isLoading}
        error={orders.error}
        onRetry={() => void orders.refetch()}
        empty={<EmptyState icon={Receipt} title="Everything is invoiced" description="Orders appear here once cut-off confirms them." />}
      />
      {canCreate && picked.length > 0 && (
        <div role="region" aria-label="Selected orders" className="sticky bottom-0 z-20 -mx-4 -mb-4 border-t bg-background/95 px-4 py-3 backdrop-blur md:-mx-6 md:-mb-6 md:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-l-4 border-saffron pl-3">
            <p className="text-sm">
              <span className="font-medium">{formatCount(picked.length)} {picked.length === 1 ? "order" : "orders"} selected</span> · <span className="font-mono tabular-nums">{formatMoney(estimateCents)}</span>
              <span className="text-muted-foreground"> (estimate)</span>
            </p>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setSelected({})}>Clear</Button>
              <Button onClick={() => { create.reset(); setConfirming(true); }}>Create invoice</Button>
            </div>
          </div>
        </div>
      )}
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={`Create an invoice for ${name}?`}
        description={
          <div className="flex flex-col gap-3">
            <p>The invoice copies each order&apos;s billable amount. It cannot be edited afterwards, and these orders cannot go on another invoice.</p>
            <MoneyBreakdown
              rows={[{ label: `${formatCount(picked.length)} orders`, cents: estimateCents }]}
              total={{ label: "Estimated total", cents: estimateCents }}
              note="Estimate from the amounts listed here; the server sets the invoice total."
            />
            {create.error && !isApiError(create.error, 409) && <FormErrorAlert messages={isApiError(create.error) ? create.error.messages : [describeError(create.error)]} />}
          </div>
        }
        confirmLabel="Create invoice"
        pending={create.isPending}
        onConfirm={() => create.mutate()}
      />
    </main>
  );
}
