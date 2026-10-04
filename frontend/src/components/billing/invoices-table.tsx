"use client";

import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Receipt } from "lucide-react";
import { useRouter } from "next/navigation";
import { parseAsInteger, parseAsString, parseAsStringLiteral, useQueryStates } from "nuqs";
import { DataTable } from "@/components/app/data-table";
import { EmptyState } from "@/components/app/empty-state";
import { EntityCombobox } from "@/components/app/entity-combobox";
import { FilterBar } from "@/components/app/filter-bar";
import { StatusBadge } from "@/components/app/status-badge";
import { useBusinessClock } from "@/hooks/use-business-clock";
import { billingApi, companiesApi, type InvoiceSummary } from "@/lib/api";
import { businessDateOf, formatBusinessDate, formatCount, formatMoney } from "@/lib/format";
import { billingKeys } from "./queries";

const STATUSES = ["UNPAID", "PAID"] as const;

function useColumns(): ColumnDef<InvoiceSummary, unknown>[] {
  const { timeZone } = useBusinessClock();
  const day = (instant: string) => formatBusinessDate(businessDateOf(instant, timeZone), { withYear: true });
  return [
    { id: "number", header: "Invoice #", cell: ({ row }) => <span className="font-mono font-medium">{row.original.invoiceNumber}</span> },
    { id: "company", header: "Company", cell: ({ row }) => row.original.company.name },
    { id: "issued", header: "Issued", cell: ({ row }) => day(row.original.createdAt) },
    { id: "orders", header: "Orders", meta: { align: "right" }, cell: ({ row }) => <span className="tabular-nums">{formatCount(row.original._count.orders)}</span> },
    { id: "total", header: "Total", meta: { align: "right" }, cell: ({ row }) => <span className="font-mono tabular-nums">{formatMoney(row.original.totalCents)}</span> },
    { id: "status", header: "Status", cell: ({ row }) => <StatusBadge kind="invoice" value={row.original.status} size="sm" /> },
    { id: "paid", header: "Paid on", cell: ({ row }) => (row.original.paidAt ? day(row.original.paidAt) : <span className="text-muted-foreground">—</span>) },
  ];
}

export function InvoicesTable() {
  const router = useRouter();
  const columns = useColumns();
  const [params, setParams] = useQueryStates(
    { company: parseAsString, status: parseAsStringLiteral(STATUSES), page: parseAsInteger.withDefault(1), size: parseAsInteger.withDefault(25) },
    { history: "replace" },
  );
  const query = { companyId: params.company ?? undefined, status: params.status ?? undefined, page: params.page, pageSize: params.size };
  const invoices = useQuery({ queryKey: billingKeys.invoices(query), queryFn: () => billingApi.listInvoices(query), placeholderData: (p) => p });
  const company = useQuery({ queryKey: ["companies", "detail", params.company], queryFn: () => companiesApi.get(params.company!), enabled: Boolean(params.company) });
  return (
    <DataTable
      columns={columns}
      data={invoices.data?.data}
      pagination={invoices.data?.pagination}
      onPageChange={(page) => void setParams({ page })}
      onPageSizeChange={(size) => void setParams({ size, page: null })}
      getRowId={(i) => i.id}
      onRowClick={(i) => router.push(`/billing/invoices/${i.id}`)}
      isLoading={invoices.isLoading}
      error={invoices.error}
      onRetry={() => void invoices.refetch()}
      toolbar={
        <FilterBar
          pageKey="page"
          filters={[{ key: "status", label: "Status", options: [{ value: "UNPAID", label: "Unpaid" }, { value: "PAID", label: "Paid" }] }]}
          extraChips={params.company ? [{ key: "company", label: `Company: ${company.data?.name ?? "…"}`, onRemove: () => void setParams({ company: null, page: null }) }] : []}
          extra={
            <EntityCombobox
              className="w-56"
              label="Company"
              placeholder="Any company"
              queryKey="companies"
              clearable
              value={params.company ? { id: params.company, label: company.data?.name ?? "Company" } : null}
              onChange={(item) => void setParams({ company: item?.id ?? null, page: null })}
              search={async (term) => (await companiesApi.list({ search: term || undefined, pageSize: 10 })).data.map((c) => ({ id: c.id, label: c.name }))}
            />
          }
        />
      }
      empty={<EmptyState icon={Receipt} title="No invoices match" description="Invoices are created from a company's uninvoiced orders." />}
    />
  );
}
