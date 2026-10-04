"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Panel } from "@/components/app/panel";
import { StatusBadge } from "@/components/app/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ordersApi, type Employee } from "@/lib/api";
import { formatBusinessDate, formatMoney, toIsoDate } from "@/lib/format";

/**
 * Recent orders for one employee. GET /orders has no employeeId filter, so the
 * list searches by name and keeps this employee's rows (backend gap).
 */
export function EmployeeOrders({ employee }: { employee: Employee }) {
  const orders = useQuery({
    queryKey: ["orders", "employee", employee.id],
    queryFn: async () => (await ordersApi.list({ search: employee.name, pageSize: 100 })).data.filter((o) => o.employeeId === employee.id).slice(0, 20),
  });
  return (
    <Panel title="Recent orders" description="Each order keeps the company it was placed for, even after a move." flush>
      {orders.isLoading ? (
        <Skeleton className="m-4 h-24" />
      ) : !orders.data?.length ? (
        <p className="p-4 text-sm text-muted-foreground">No orders yet.</p>
      ) : (
        <ul className="divide-y">
          {orders.data.map((o) => (
            <li key={o.id} className="flex flex-wrap items-center gap-3 px-4 py-2 text-sm">
              <Link href={`/orders/${o.id}`} className="num text-primary hover:underline">{o.orderNumber}</Link>
              <span className="num text-muted-foreground">{formatBusinessDate(toIsoDate(o.deliveryDate))}</span>
              <span className="text-muted-foreground">{o.company.name}</span>
              <span className="ml-auto num">{formatMoney(o.totalCents)}</span>
              <StatusBadge kind="order" value={o.status} size="sm" />
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
