"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Truck } from "lucide-react";
import { DataTable } from "@/components/app/data-table";
import { EmptyState } from "@/components/app/empty-state";
import { StatusBadge } from "@/components/app/status-badge";
import { Button } from "@/components/ui/button";
import type { DispatchDrop } from "@/lib/api";
import { formatBusinessTime, formatCount, formatDuration } from "@/lib/format";
import type { DropCardProps } from "./drop-card";
import { outForDeliveryBlocker } from "./dispatch-model";
import { DriverSelect } from "./driver-select";

type Props = {
  drops: DispatchDrop[];
  card: Omit<DropCardProps, "drop" | "defaultDriverId">;
  defaultDriverFor: (drop: DispatchDrop) => string | null;
  pagination?: { page: number; pageSize: number; totalItems: number; totalPages: number };
  onPageChange: (page: number) => void;
  isLoading: boolean;
};

export function TableView({ drops, card, defaultDriverFor, pagination, onPageChange, isLoading }: Props) {
  const columns: ColumnDef<DispatchDrop, unknown>[] = [
    { id: "time", header: "Delivery", cell: ({ row }) => <span className="num font-semibold">{formatBusinessTime(row.original.scheduledDeliveryAt, card.timeZone)}</span> },
    {
      id: "leave",
      header: "Leave by",
      cell: ({ row }) => (row.original.plannedDispatchReadyAt ? <span className="num">{formatBusinessTime(row.original.plannedDispatchReadyAt, card.timeZone)}</span> : "—"),
    },
    { id: "company", header: "Company", cell: ({ row }) => row.original.company.name },
    { id: "address", header: "Address", cell: ({ row }) => row.original.addressLabelSnapshot },
    { id: "orders", header: "Orders", meta: { align: "right" }, cell: ({ row }) => <span className="num">{formatCount(row.original._count.orders)}</span> },
    { id: "meals", header: "Meals", meta: { align: "right" }, cell: ({ row }) => <span className="num">{formatCount(row.original.meals)}</span> },
    { id: "status", header: "Status", meta: { align: "center" }, cell: ({ row }) => <StatusBadge kind="drop" value={row.original.status} size="sm" /> },
    {
      id: "driver",
      header: "Driver",
      cell: ({ row }) => (
        <div className="w-44" onClick={(e) => e.stopPropagation()}>
          <DriverSelect drop={row.original} drivers={card.drivers} defaultDriverId={defaultDriverFor(row.original)} canAssign={card.canAssign} pending={card.pending} onAssign={(id) => card.onAssign(row.original, id)} />
        </div>
      ),
    },
    {
      id: "result",
      header: "Result",
      meta: { align: "center" },
      cell: ({ row }) => {
        const d = row.original;
        if (d.onTime === null || !d.deliveredAt) return "—";
        const late = new Date(d.deliveredAt).getTime() - new Date(d.scheduledDeliveryAt).getTime();
        return d.onTime ? <StatusBadge kind="onTime" value="ON_TIME" size="sm" /> : <StatusBadge kind="onTime" value="LATE" size="sm" label={`Late by ${formatDuration(late)}`} />;
      },
    },
    {
      id: "action",
      header: "",
      enableHiding: false,
      cell: ({ row }) => {
        const d = row.original;
        if (d.status !== "DISPATCH_READY" || !card.canAdvance) return null;
        const blocker = outForDeliveryBlocker(d);
        return (
          <Button size="sm" disabled={Boolean(blocker) || card.pending} title={blocker ?? undefined} onClick={(e) => { e.stopPropagation(); card.onOutForDelivery(d); }}>
            <Truck data-icon="inline-start" /> Out for delivery
          </Button>
        );
      },
    },
  ];
  return (
    <DataTable
      columns={columns}
      data={drops}
      pagination={pagination}
      onPageChange={onPageChange}
      isLoading={isLoading}
      getRowId={(d) => d.id}
      onRowClick={card.onOpen}
      empty={<EmptyState icon={Truck} title="No drops match" description="Change the date or clear the search." />}
    />
  );
}
