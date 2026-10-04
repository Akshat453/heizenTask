"use client";

import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, Plus, UserCog } from "lucide-react";
import { parseAsInteger, parseAsString, useQueryStates } from "nuqs";
import { useState } from "react";
import { AccessDenied } from "@/components/app/access-denied";
import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { DataTable } from "@/components/app/data-table";
import { EmptyState } from "@/components/app/empty-state";
import { FilterBar } from "@/components/app/filter-bar";
import { PageHeader } from "@/components/app/page-header";
import { StatusBadge } from "@/components/app/status-badge";
import { useAuth } from "@/components/auth/auth-provider";
import { StaffDialog, staffKeys, useSetStaffActive } from "@/components/staff/staff-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { staffApi, type StaffMember } from "@/lib/api";
import { P } from "@/lib/permissions";

export default function StaffPage() {
  const { can, user } = useAuth();
  const [dialog, setDialog] = useState<{ member?: StaffMember } | null>(null);
  const [toggling, setToggling] = useState<StaffMember | null>(null);
  const setActive = useSetStaffActive();
  const [params, setParams] = useQueryStates(
    { q: parseAsString, page: parseAsInteger.withDefault(1), size: parseAsInteger.withDefault(25) },
    { history: "replace" },
  );
  const query = { search: params.q ?? undefined, page: params.page, pageSize: params.size };
  const staff = useQuery({ queryKey: [...staffKeys.all, "list", query], queryFn: () => staffApi.list(query), placeholderData: (p) => p, enabled: can(P.staffManage) });
  if (!can(P.staffManage)) return <AccessDenied className="py-24" />;

  const columns: ColumnDef<StaffMember, unknown>[] = [
    { id: "name", header: "Name", cell: ({ row }) => <span className="font-medium">{row.original.name}{row.original.id === user?.id && <span className="text-muted-foreground"> (you)</span>}</span> },
    { id: "email", header: "Email", cell: ({ row }) => row.original.email },
    { id: "role", header: "Role", cell: ({ row }) => <Badge variant="secondary">{row.original.role.name}</Badge> },
    { id: "active", header: "Active", meta: { align: "center" }, cell: ({ row }) => <StatusBadge kind="active" value={row.original.isActive ? "ACTIVE" : "INACTIVE"} size="sm" /> },
    {
      id: "actions",
      header: () => <span className="sr-only">Actions</span>,
      enableHiding: false,
      meta: { align: "right" },
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button size="icon-sm" variant="ghost" aria-label={`Actions for ${row.original.name}`} />}>
            <MoreHorizontal />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setDialog({ member: row.original })}>Edit name or role</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setToggling(row.original)} disabled={row.original.id === user?.id}>
              {row.original.isActive ? "Deactivate" : "Reactivate"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <main className="flex flex-col gap-6 p-4 md:p-6">
      <PageHeader
        title="Staff"
        description="People who sign in to Fernleaf. Roles decide what each person can see and do."
        actions={<Button onClick={() => setDialog({})}><Plus data-icon="inline-start" /> Add staff member</Button>}
      />
      <DataTable
        columns={columns}
        data={staff.data?.data}
        pagination={staff.data?.pagination}
        onPageChange={(page) => void setParams({ page })}
        onPageSizeChange={(size) => void setParams({ size, page: null })}
        getRowId={(s) => s.id}
        isLoading={staff.isLoading}
        error={staff.error}
        onRetry={() => void staff.refetch()}
        toolbar={<FilterBar searchKey="q" searchPlaceholder="Name or email" pageKey="page" />}
        empty={<EmptyState icon={UserCog} title="No staff match" description="Clear the search, or add a staff member." />}
      />
      {dialog && <StaffDialog key={dialog.member?.id ?? "new"} member={dialog.member} onOpenChange={(open) => !open && setDialog(null)} />}
      <ConfirmDialog
        open={Boolean(toggling)}
        onOpenChange={(open) => !open && setToggling(null)}
        title={toggling?.isActive ? `Deactivate ${toggling.name}?` : `Reactivate ${toggling?.name}?`}
        description={toggling?.isActive
          ? "They can no longer sign in, and any open session stops on its next request. Their past actions stay on record."
          : "They can sign in again with their existing password and role."}
        confirmLabel={toggling?.isActive ? "Deactivate" : "Reactivate"}
        destructive={toggling?.isActive}
        pending={setActive.isPending}
        onConfirm={() => toggling && setActive.mutate({ member: toggling, isActive: !toggling.isActive }, { onSettled: () => setToggling(null) })}
      />
    </main>
  );
}
