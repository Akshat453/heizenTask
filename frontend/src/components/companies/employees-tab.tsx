"use client";

import { useQuery } from "@tanstack/react-query";
import { Plus, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { DataTable } from "@/components/app/data-table";
import { EmptyState } from "@/components/app/empty-state";
import { employeeColumns } from "@/components/employees/employee-columns";
import { EmployeeCreateDialog } from "@/components/employees/employee-create-dialog";
import { employeeKeys } from "@/components/employees/queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { employeesApi, type CompanyDetail } from "@/lib/api";

const columns = employeeColumns({ showCompany: false });

export function EmployeesTab({ company, canManage }: { company: CompanyDetail; canManage: boolean }) {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [text, setText] = useState("");
  const search = useDebouncedValue(text.trim(), 300);
  const [adding, setAdding] = useState(false);
  const query = { companyId: company.id, page, pageSize: 25, search: search || undefined };
  const employees = useQuery({ queryKey: employeeKeys.list(query), queryFn: () => employeesApi.list(query), placeholderData: (p) => p });
  return (
    <>
      <DataTable
        columns={columns}
        data={employees.data?.data}
        pagination={employees.data?.pagination}
        onPageChange={setPage}
        getRowId={(e) => e.id}
        onRowClick={(e) => router.push(`/employees/${e.id}`)}
        isLoading={employees.isLoading}
        error={employees.error}
        onRetry={() => void employees.refetch()}
        toolbar={
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Input value={text} onChange={(e) => { setText(e.target.value); setPage(1); }} placeholder="Search name or email" aria-label="Search employees" className="max-w-xs" />
            {canManage && (
              <Button onClick={() => setAdding(true)}>
                <Plus data-icon="inline-start" /> Add employee
              </Button>
            )}
          </div>
        }
        empty={<EmptyState icon={Users} title="No employees yet" description="Add the people this company orders meals for." />}
      />
      {adding && <EmployeeCreateDialog open onOpenChange={setAdding} company={{ id: company.id, label: company.name }} />}
    </>
  );
}
