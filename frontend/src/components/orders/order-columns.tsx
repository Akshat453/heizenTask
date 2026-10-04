"use client";

import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { StatusBadge } from "@/components/app/status-badge";
import type { CutoffInfo, OrderListItem } from "@/lib/api";
import { formatBusinessDate, formatBusinessTime, formatDuration, formatMoney, toIsoDate } from "@/lib/format";
import { cn } from "@/lib/utils";

const DAY_MS = 24 * 60 * 60_000;

/** Today pill: saffron marks "today" only. */
export function TodayPill({ className }: { className?: string }) {
  return (
    <span className={cn("rounded-full border border-saffron/40 bg-saffron-soft px-1.5 text-[11px] font-medium text-foreground", className)}>
      Today
    </span>
  );
}

/** "Locks in 5 h" (warning, under 24 h), "Open" (muted) or "Locked" (neutral), from the API's cut-off instant. */
export function CutoffChip({ cutoff, nowMs, timeZone }: { cutoff: CutoffInfo | undefined; nowMs: number; timeZone: string }) {
  if (!cutoff) return <span className="text-muted-foreground">—</span>;
  const remaining = new Date(cutoff.cutoffInstant).getTime() - nowMs;
  if (cutoff.passed || remaining <= 0) return <StatusBadge kind="cutoff" value="LOCKED" size="sm" />;
  if (remaining < DAY_MS) return <StatusBadge kind="cutoff" value="SOON" size="sm" label={`Locks in ${formatDuration(remaining)}`} />;
  return (
    <span className="text-xs text-muted-foreground" title={`Cut-off ${formatBusinessDate(cutoff.cutoffDate)}, ${formatBusinessTime(cutoff.cutoffInstant, timeZone)}`}>
      Open until <span className="num">{formatBusinessDate(cutoff.cutoffDate)}</span>
    </span>
  );
}

type ColumnContext = {
  today: string | null;
  timeZone: string;
  nowMs: number;
  /** Cut-off per delivery date; undefined when the role cannot read cut-offs. */
  cutoffs: Record<string, CutoffInfo> | undefined;
};

export function orderColumns({ today, timeZone, nowMs, cutoffs }: ColumnContext): ColumnDef<OrderListItem, unknown>[] {
  const columns: ColumnDef<OrderListItem, unknown>[] = [
    {
      id: "orderNumber",
      header: "Order #",
      enableHiding: false,
      cell: ({ row }) => (
        <Link href={`/orders/${row.original.id}`} className="num font-medium text-primary hover:underline" onClick={(e) => e.stopPropagation()}>
          {row.original.orderNumber}
        </Link>
      ),
    },
    {
      id: "delivery",
      header: "Delivery",
      cell: ({ row }) => {
        const date = toIsoDate(row.original.deliveryDate);
        return (
          <span className="flex items-center gap-2 whitespace-nowrap">
            <span className="num">{formatBusinessDate(date)}</span>
            <span className="num text-muted-foreground">{formatBusinessTime(row.original.deliveryAt, timeZone)}</span>
            {date === today && <TodayPill />}
          </span>
        );
      },
    },
    { id: "employee", header: "Employee", cell: ({ row }) => row.original.employee.name },
    { id: "company", header: "Company", cell: ({ row }) => row.original.company.name },
    {
      id: "total",
      header: "Total",
      meta: { align: "right" },
      cell: ({ row }) => <span className="num">{formatMoney(row.original.totalCents)}</span>,
    },
    {
      id: "status",
      header: "Status",
      meta: { align: "center" },
      cell: ({ row }) => <StatusBadge kind="order" value={row.original.status} size="sm" />,
    },
    {
      id: "invoiced",
      header: "Invoiced",
      meta: { align: "center" },
      cell: ({ row }) => (
        <StatusBadge kind="invoice" value={row.original.invoiceOrder ? "INVOICED" : "NOT_INVOICED"} size="sm" />
      ),
    },
  ];
  if (cutoffs)
    columns.push({
      id: "cutoff",
      header: "Cut-off",
      cell: ({ row }) => <CutoffChip cutoff={cutoffs[toIsoDate(row.original.deliveryDate)]} nowMs={nowMs} timeZone={timeZone} />,
    });
  return columns;
}
