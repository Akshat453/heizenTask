"use client";

import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Building2, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { parseAsInteger, parseAsString, useQueryStates } from "nuqs";
import { DataTable } from "@/components/app/data-table";
import { EmptyState } from "@/components/app/empty-state";
import { FilterBar } from "@/components/app/filter-bar";
import { PageHeader } from "@/components/app/page-header";
import { useAuth } from "@/components/auth/auth-provider";
import { companyKeys } from "@/components/companies/queries";
import { Button } from "@/components/ui/button";
import { companiesApi, type Company } from "@/lib/api";
import { formatCount } from "@/lib/format";
import { P } from "@/lib/permissions";

const columns: ColumnDef<Company, unknown>[] = [
  {
    id: "name",
    header: "Name",
    enableHiding: false,
    cell: ({ row }) => (
      <Link href={`/companies/${row.original.id}`} className="font-medium text-primary hover:underline" onClick={(e) => e.stopPropagation()}>
        {row.original.name}
      </Link>
    ),
  },
  {
    id: "domains",
    header: "Domains",
    cell: ({ row }) => (
      <span className="flex flex-wrap gap-1">
        {row.original.domains.map((d) => (
          <span key={d.domain} className="num rounded-full border bg-secondary px-2 text-xs text-secondary-foreground">{d.domain}</span>
        ))}
      </span>
    ),
  },
  { id: "tier", header: "Price tier", cell: ({ row }) => row.original.priceTier?.name ?? <span className="text-muted-foreground">Default</span> },
  { id: "employees", header: "Employees", meta: { align: "right" }, cell: ({ row }) => <span className="num">{formatCount(row.original._count?.employees ?? 0)}</span> },
  { id: "owner", header: "Owner", cell: ({ row }) => row.original.ownerEmployee?.name ?? <span className="text-muted-foreground">—</span> },
];

export default function CompaniesPage() {
  const router = useRouter();
  const { can } = useAuth();
  const [params, setParams] = useQueryStates({ q: parseAsString, page: parseAsInteger.withDefault(1), size: parseAsInteger.withDefault(25) }, { history: "replace" });
  const query = { page: params.page, pageSize: params.size, search: params.q ?? undefined };
  const companies = useQuery({ queryKey: companyKeys.list(query), queryFn: () => companiesApi.list(query), placeholderData: (p) => p });
  return (
    <main className="flex flex-col gap-6 p-4 md:p-6">
      <PageHeader
        title="Companies"
        description="Corporate customers: their people, addresses, calendar, menu and pricing."
        actions={
          can(P.companiesManage) && (
            <Button render={<Link href="/companies/new" />} nativeButton={false}>
              <Plus data-icon="inline-start" /> New company
            </Button>
          )
        }
      />
      <DataTable
        columns={columns}
        data={companies.data?.data}
        pagination={companies.data?.pagination}
        onPageChange={(page) => void setParams({ page })}
        onPageSizeChange={(size) => void setParams({ size, page: null })}
        getRowId={(c) => c.id}
        onRowClick={(c) => router.push(`/companies/${c.id}`)}
        isLoading={companies.isLoading}
        error={companies.error}
        onRetry={() => void companies.refetch()}
        toolbar={<FilterBar searchKey="q" searchPlaceholder="Company name or domain" />}
        empty={<EmptyState icon={Building2} title="No companies match" description="Clear the search, or add the first company." />}
      />
    </main>
  );
}
