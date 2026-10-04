"use client";

import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Building2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { parseAsInteger, parseAsString, useQueryStates } from "nuqs";
import { DataTable } from "@/components/app/data-table";
import { EmptyState } from "@/components/app/empty-state";
import { FilterBar } from "@/components/app/filter-bar";
import { Skeleton } from "@/components/ui/skeleton";
import { useBusinessClock } from "@/hooks/use-business-clock";
import { companiesApi, type Company } from "@/lib/api";
import { businessDateOf, formatBusinessDate, formatCount, formatMoney } from "@/lib/format";
import { useInvoiceCount, useUninvoicedSummary } from "./queries";

const Loading = () => <Skeleton className="ml-auto h-4 w-16" />;

function UninvoicedCount({ id }: { id: string }) {
  const q = useUninvoicedSummary(id);
  return q.data ? <span className="tabular-nums">{formatCount(q.data.pagination.totalItems)}</span> : <Loading />;
}
function UninvoicedAmount({ id }: { id: string }) {
  const q = useUninvoicedSummary(id);
  return q.data ? <span className="font-mono tabular-nums">{formatMoney(q.data.totalUninvoicedCents)}</span> : <Loading />;
}
function OldestUninvoiced({ id }: { id: string }) {
  const q = useUninvoicedSummary(id);
  if (!q.data) return <Loading />;
  const oldest = q.data.data[0];
  return oldest ? <span>{formatBusinessDate(oldest.deliveryDate, { withYear: true })}</span> : <span className="text-muted-foreground">—</span>;
}
function UnpaidInvoices({ id }: { id: string }) {
  const q = useInvoiceCount({ companyId: id, status: "UNPAID" });
  if (!q.data) return <Loading />;
  const n = q.data.pagination.totalItems;
  return n ? <span className="tabular-nums">{formatCount(n)} unpaid</span> : <span className="text-muted-foreground">None</span>;
}
function LastInvoice({ id }: { id: string }) {
  const { timeZone } = useBusinessClock();
  const q = useInvoiceCount({ companyId: id }); // newest first
  if (!q.data) return <Loading />;
  const last = q.data.data[0];
  return last ? <span>{formatBusinessDate(businessDateOf(last.createdAt, timeZone), { withYear: true })}</span> : <span className="text-muted-foreground">Never</span>;
}

const columns: ColumnDef<Company, unknown>[] = [
  { id: "name", header: "Company", cell: ({ row }) => <span className="font-medium">{row.original.name}</span> },
  { id: "count", header: "Orders not invoiced", meta: { align: "right" }, cell: ({ row }) => <UninvoicedCount id={row.original.id} /> },
  { id: "amount", header: "Amount not invoiced", meta: { align: "right" }, cell: ({ row }) => <UninvoicedAmount id={row.original.id} /> },
  { id: "oldest", header: "Oldest uninvoiced delivery", cell: ({ row }) => <OldestUninvoiced id={row.original.id} /> },
  { id: "unpaid", header: "Unpaid invoices", cell: ({ row }) => <UnpaidInvoices id={row.original.id} /> },
  { id: "last", header: "Last invoice", cell: ({ row }) => <LastInvoice id={row.original.id} /> },
];

/** One row per company; each figure comes from the server (per-company billing endpoints). */
export function ByCompanyTable() {
  const router = useRouter();
  const [params, setParams] = useQueryStates(
    { q: parseAsString, page: parseAsInteger.withDefault(1), size: parseAsInteger.withDefault(25) },
    { history: "replace" },
  );
  const query = { search: params.q ?? undefined, page: params.page, pageSize: params.size };
  const companies = useQuery({ queryKey: ["companies", "list", query], queryFn: () => companiesApi.list(query), placeholderData: (p) => p });
  return (
    <DataTable
      columns={columns}
      data={companies.data?.data}
      pagination={companies.data?.pagination}
      onPageChange={(page) => void setParams({ page })}
      onPageSizeChange={(size) => void setParams({ size, page: null })}
      getRowId={(c) => c.id}
      onRowClick={(c) => router.push(`/companies/${c.id}/billing`)}
      isLoading={companies.isLoading}
      error={companies.error}
      onRetry={() => void companies.refetch()}
      toolbar={<FilterBar searchKey="q" searchPlaceholder="Company name" pageKey="page" />}
      empty={<EmptyState icon={Building2} title="No companies match" description="Clear the search to see every company." />}
    />
  );
}
