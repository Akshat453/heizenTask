"use client";

import { useQuery } from "@tanstack/react-query";
import { Plus, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { parseAsInteger, parseAsString, useQueryStates } from "nuqs";
import { useState } from "react";
import { DataTable } from "@/components/app/data-table";
import { EmptyState } from "@/components/app/empty-state";
import { EntityCombobox } from "@/components/app/entity-combobox";
import { FilterBar } from "@/components/app/filter-bar";
import { PageHeader } from "@/components/app/page-header";
import { useAuth } from "@/components/auth/auth-provider";
import { employeeColumns } from "@/components/employees/employee-columns";
import { EmployeeCreateDialog } from "@/components/employees/employee-create-dialog";
import { employeeKeys } from "@/components/employees/queries";
import { Button } from "@/components/ui/button";
import { companiesApi, employeesApi } from "@/lib/api";
import { P } from "@/lib/permissions";

const columns = employeeColumns({ showCompany: true });

export default function EmployeesPage() {
  const router = useRouter();
  const { can } = useAuth();
  const [adding, setAdding] = useState(false);
  const [params, setParams] = useQueryStates(
    { search: parseAsString, company: parseAsString, page: parseAsInteger.withDefault(1), size: parseAsInteger.withDefault(25) },
    { history: "replace" },
  );
  const query = { page: params.page, pageSize: params.size, search: params.search ?? undefined, companyId: params.company ?? undefined };
  const employees = useQuery({ queryKey: employeeKeys.list(query), queryFn: () => employeesApi.list(query), placeholderData: (p) => p });
  const company = useQuery({
    queryKey: ["companies", "detail", params.company],
    queryFn: () => companiesApi.get(params.company!),
    enabled: Boolean(params.company) && can(P.companiesRead),
  });

  return (
    <main className="flex flex-col gap-6 p-4 md:p-6">
      <PageHeader
        title="Employees"
        description="The people meals are ordered for. Each belongs to one company."
        actions={can(P.employeesManage) && <Button onClick={() => setAdding(true)}><Plus data-icon="inline-start" /> Add employee</Button>}
      />
      <DataTable
        columns={columns}
        data={employees.data?.data}
        pagination={employees.data?.pagination}
        onPageChange={(page) => void setParams({ page })}
        onPageSizeChange={(size) => void setParams({ size, page: null })}
        getRowId={(e) => e.id}
        onRowClick={(e) => router.push(`/employees/${e.id}`)}
        isLoading={employees.isLoading}
        error={employees.error}
        onRetry={() => void employees.refetch()}
        toolbar={
          <FilterBar
            searchKey="search"
            searchPlaceholder="Name or email"
            extraChips={params.company ? [{ key: "company", label: `Company: ${company.data?.name ?? "…"}`, onRemove: () => void setParams({ company: null, page: null }) }] : []}
            extra={
              can(P.companiesRead) && (
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
              )
            }
          />
        }
        empty={<EmptyState icon={Users} title="No employees match" description="Clear a filter, or add an employee." />}
      />
      {adding && <EmployeeCreateDialog open onOpenChange={setAdding} />}
    </main>
  );
}
