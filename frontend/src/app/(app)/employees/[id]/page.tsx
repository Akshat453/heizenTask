"use client";

import { useQuery } from "@tanstack/react-query";
import { Eye, Plus } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ErrorState } from "@/components/app/error-state";
import { PageHeader } from "@/components/app/page-header";
import { useAuth } from "@/components/auth/auth-provider";
import { EmployeeFlags } from "@/components/employees/employee-columns";
import { EmployeeEditor } from "@/components/employees/employee-editor";
import { EmployeeOrders } from "@/components/employees/employee-orders";
import { employeeKeys } from "@/components/employees/queries";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { employeesApi } from "@/lib/api";
import { P } from "@/lib/permissions";

export default function EmployeePage() {
  const { id } = useParams<{ id: string }>();
  const { can } = useAuth();
  const employee = useQuery({ queryKey: employeeKeys.detail(id), queryFn: () => employeesApi.get(id) });
  if (employee.isLoading) return <Skeleton className="m-6 h-96" />;
  if (employee.error || !employee.data)
    return (
      <main className="p-4 md:p-6">
        <ErrorState error={employee.error} title="Could not load this employee" onRetry={() => void employee.refetch()} />
      </main>
    );
  const e = employee.data;
  return (
    <main className="flex flex-col gap-6 p-4 md:p-6">
      <PageHeader
        title={e.name}
        description={<span className="flex items-center gap-2">{e.email ?? "No email"} · {e.company.name} <EmployeeFlags employee={e} /></span>}
        actions={
          <>
            <Button variant="outline" render={<Link href={`/menu/preview?employee=${e.id}`} />} nativeButton={false}>
              <Eye data-icon="inline-start" /> Preview their menu
            </Button>
            {can(P.ordersCreate) && (
              <Button render={<Link href={`/orders/new?employee=${e.id}`} />} nativeButton={false}>
                <Plus data-icon="inline-start" /> New order for this employee
              </Button>
            )}
          </>
        }
      />
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <EmployeeEditor key={JSON.stringify([e.company.id, e.name, e.email, e.defaultDeliveryAddress?.id, e.canChooseDeliveryAddress, e.canChangeDeliveryTime, e.canChangePackaging, e.allergens.length, e.dietaryTags.length])} employee={e} />
        </div>
        <div className="lg:col-span-5">{can(P.ordersRead) && <EmployeeOrders employee={e} />}</div>
      </div>
    </main>
  );
}
