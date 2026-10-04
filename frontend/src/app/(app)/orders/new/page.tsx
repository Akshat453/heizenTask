"use client";

import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { AccessDenied } from "@/components/app/access-denied";
import { useAuth } from "@/components/auth/auth-provider";
import { employeeKeys } from "@/components/employees/queries";
import { OrderBuilder } from "@/components/orders/builder/order-builder";
import { Skeleton } from "@/components/ui/skeleton";
import { employeesApi } from "@/lib/api";
import { P } from "@/lib/permissions";

export default function NewOrderPage() {
  const { can } = useAuth();
  const employeeId = useSearchParams().get("employee");
  const employee = useQuery({ queryKey: employeeKeys.detail(employeeId ?? ""), queryFn: () => employeesApi.get(employeeId!), enabled: Boolean(employeeId) });
  if (!can(P.ordersCreate)) return <AccessDenied className="py-24" />;
  if (employeeId && employee.isLoading) return <Skeleton className="m-6 h-96" />;
  // An unknown or unreadable employee simply starts the builder empty.
  const initial = employee.data ? { id: employee.data.id, label: employee.data.name } : undefined;
  return <OrderBuilder key={initial?.id ?? "new"} initialEmployee={initial} />;
}
