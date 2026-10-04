"use client";

import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Flame, Snowflake, UtensilsCrossed } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { parseAsInteger, parseAsString, useQueryStates } from "nuqs";
import { DataTable } from "@/components/app/data-table";
import { EmptyState } from "@/components/app/empty-state";
import { FilterBar } from "@/components/app/filter-bar";
import { StatusBadge } from "@/components/app/status-badge";
import { catalogueApi, type DishListItem } from "@/lib/api";
import { formatCount, formatMoney } from "@/lib/format";
import { catalogueKeys, useCatalogueReference } from "./queries";

export function Thumb({ src, className = "size-10" }: { src?: string | null; className?: string }) {
  return (
    <span className={`relative block shrink-0 overflow-hidden rounded-md bg-muted ${className}`}>
      {src && <Image src={src} alt="" fill unoptimized sizes="40px" className="object-cover" />}
    </span>
  );
}

const columns: ColumnDef<DishListItem, unknown>[] = [
  { id: "thumb", header: "", enableHiding: false, cell: ({ row }) => <Thumb src={row.original.imageUrl} /> },
  { id: "name", header: "Name", enableHiding: false, cell: ({ row }) => <span className="font-medium">{row.original.name}</span> },
  { id: "sku", header: "SKU", cell: ({ row }) => <span className="num text-muted-foreground">{row.original.sku}</span> },
  { id: "station", header: "Station", cell: ({ row }) => row.original.station?.name ?? <span className="text-muted-foreground">Unassigned</span> },
  {
    id: "temperature",
    header: "Temp",
    meta: { align: "center" },
    cell: ({ row }) =>
      row.original.temperature === "HOT" ? <Flame className="mx-auto size-4 text-warning" aria-label="Hot" /> : <Snowflake className="mx-auto size-4 text-info" aria-label="Cold" />,
  },
  {
    id: "tags",
    header: "Dietary",
    cell: ({ row }) => {
      const tags = row.original.dietaryTags.map((t) => t.dietaryTag.name);
      return (
        <span className="flex flex-wrap gap-1">
          {tags.slice(0, 3).map((t) => (
            <span key={t} className="rounded-md border bg-secondary px-1.5 text-[11px] text-secondary-foreground">{t}</span>
          ))}
          {tags.length > 3 && <span className="text-xs text-muted-foreground">+{tags.length - 3}</span>}
        </span>
      );
    },
  },
  { id: "allergens", header: "Allergens", meta: { align: "right" }, cell: ({ row }) => <span className="num">{formatCount(row.original.allergens.length)}</span> },
  { id: "cost", header: "Cost", meta: { align: "right" }, cell: ({ row }) => <span className="num">{formatMoney(row.original.costCents)}</span> },
  {
    id: "active",
    header: "Status",
    meta: { align: "center" },
    cell: ({ row }) => <StatusBadge kind="active" value={row.original.isActive ? "ACTIVE" : "INACTIVE"} size="sm" />,
  },
];

const parsers = { q: parseAsString, active: parseAsString, station: parseAsString, temp: parseAsString, page: parseAsInteger.withDefault(1), size: parseAsInteger.withDefault(25) };

export function DishesTab({ action }: { action?: React.ReactNode }) {
  const router = useRouter();
  const [params, setParams] = useQueryStates(parsers, { history: "replace" });
  const ref = useCatalogueReference();
  const query = {
    page: params.page,
    pageSize: params.size,
    search: params.q ?? undefined,
    // Only isActive=true is sent: the API turns "false" into true (backend gap).
    isActive: params.active === "yes" ? (true as const) : undefined,
    stationId: params.station ?? undefined,
    temperature: params.temp === "HOT" ? ("HOT" as const) : params.temp === "COLD" ? ("COLD" as const) : undefined,
  };
  const dishes = useQuery({ queryKey: catalogueKeys.dishes(query), queryFn: () => catalogueApi.listDishes(query), placeholderData: (p) => p });

  return (
    <DataTable
      columns={columns}
      data={dishes.data?.data}
      pagination={dishes.data?.pagination}
      onPageChange={(page) => void setParams({ page })}
      onPageSizeChange={(size) => void setParams({ size, page: null })}
      getRowId={(d) => d.id}
      onRowClick={(d) => router.push(`/catalogue/dishes/${d.id}`)}
      isLoading={dishes.isLoading}
      error={dishes.error}
      onRetry={() => void dishes.refetch()}
      toolbar={
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <FilterBar
            searchKey="q"
            searchPlaceholder="Dish name or SKU"
            filters={[
              { key: "active", label: "Status", options: [{ value: "yes", label: "Active only" }] },
              { key: "station", label: "Station", options: (ref.stations.data ?? []).map((s) => ({ value: s.id, label: s.name })) },
              { key: "temp", label: "Temperature", options: [{ value: "HOT", label: "Hot" }, { value: "COLD", label: "Cold" }] },
            ]}
          />
          {action}
        </div>
      }
      empty={<EmptyState icon={UtensilsCrossed} title="No dishes match" description="Clear a filter, or add the first dish." />}
    />
  );
}
