"use client";

import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { ListPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { parseAsInteger, parseAsString, useQueryStates } from "nuqs";
import type { ReactNode } from "react";
import { DataTable } from "@/components/app/data-table";
import { EmptyState } from "@/components/app/empty-state";
import { FilterBar } from "@/components/app/filter-bar";
import { StatusBadge } from "@/components/app/status-badge";
import { catalogueApi, type Option } from "@/lib/api";
import { formatMoney } from "@/lib/format";
import { catalogueKeys } from "./queries";

const columns: ColumnDef<Option, unknown>[] = [
  { id: "name", header: "Name", enableHiding: false, cell: ({ row }) => <span className="font-medium">{row.original.name}</span> },
  { id: "cost", header: "Cost", meta: { align: "right" }, cell: ({ row }) => <span className="num">{formatMoney(row.original.costCents)}</span> },
  { id: "allergens", header: "Allergens", cell: ({ row }) => row.original.allergens.map((a) => a.allergen.name).join(", ") || <span className="text-muted-foreground">None</span> },
  { id: "dietary", header: "Dietary", cell: ({ row }) => row.original.dietaryTags.map((t) => t.dietaryTag.name).join(", ") || <span className="text-muted-foreground">None</span> },
  { id: "active", header: "Status", meta: { align: "center" }, cell: ({ row }) => <StatusBadge kind="active" value={row.original.isActive ? "ACTIVE" : "INACTIVE"} size="sm" /> },
];

const parsers = { oq: parseAsString, oactive: parseAsString, opage: parseAsInteger.withDefault(1), osize: parseAsInteger.withDefault(25) };

export function OptionsTab({ action }: { action?: ReactNode }) {
  const router = useRouter();
  const [params, setParams] = useQueryStates(parsers, { history: "replace" });
  const query = {
    page: params.opage,
    pageSize: params.osize,
    search: params.oq ?? undefined,
    isActive: params.oactive === "active" ? true : params.oactive === "inactive" ? false : undefined,
  };
  const options = useQuery({ queryKey: catalogueKeys.options(query), queryFn: () => catalogueApi.searchOptions(query), placeholderData: (p) => p });
  return (
    <DataTable
      columns={columns}
      data={options.data?.data}
      pagination={options.data?.pagination}
      onPageChange={(opage) => void setParams({ opage })}
      onPageSizeChange={(osize) => void setParams({ osize, opage: null })}
      getRowId={(o) => o.id}
      onRowClick={(o) => router.push(`/catalogue/options/${o.id}`)}
      isLoading={options.isLoading}
      error={options.error}
      onRetry={() => void options.refetch()}
      toolbar={
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <FilterBar
            searchKey="oq"
            pageKey="opage"
            searchPlaceholder="Option name"
            filters={[{ key: "oactive", label: "Status", options: [{ value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }] }]}
          />
          {action}
        </div>
      }
      empty={<EmptyState icon={ListPlus} title="No options match" description="Options are the choices inside a dish's option groups." />}
    />
  );
}
