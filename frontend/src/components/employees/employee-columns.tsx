"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Clock, MapPin, Package, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { Employee } from "@/lib/api";
import { cn } from "@/lib/utils";

function Flag({ on, icon: Icon, label }: { on: boolean; icon: LucideIcon; label: string }) {
  return (
    <Tooltip>
      <TooltipTrigger render={<span tabIndex={0} />} className={cn("grid size-6 place-items-center rounded", on ? "bg-success-soft text-success" : "text-muted-foreground/50")}>
        <Icon className="size-3.5" aria-label={`${label}: ${on ? "allowed" : "not allowed"}`} />
      </TooltipTrigger>
      <TooltipContent>{label}: {on ? "allowed" : "not allowed"}</TooltipContent>
    </Tooltip>
  );
}

/** Ordering permission flags as three icons (filled when allowed). */
export function EmployeeFlags({ employee }: { employee: Employee }) {
  return (
    <span className="inline-flex gap-1">
      <Flag on={employee.canChooseDeliveryAddress} icon={MapPin} label="Choose own delivery address" />
      <Flag on={employee.canChangeDeliveryTime} icon={Clock} label="Change delivery time" />
      <Flag on={employee.canChangePackaging} icon={Package} label="Change packaging" />
    </span>
  );
}

export function employeeColumns({ showCompany }: { showCompany: boolean }): ColumnDef<Employee, unknown>[] {
  const columns: ColumnDef<Employee, unknown>[] = [
    {
      id: "name",
      header: "Name",
      enableHiding: false,
      cell: ({ row }) => (
        <Link href={`/employees/${row.original.id}`} className="font-medium text-primary hover:underline" onClick={(e) => e.stopPropagation()}>
          {row.original.name}
        </Link>
      ),
    },
    { id: "email", header: "Email", cell: ({ row }) => row.original.email ?? <span className="text-muted-foreground">—</span> },
  ];
  if (showCompany) columns.push({ id: "company", header: "Company", cell: ({ row }) => row.original.company.name });
  columns.push(
    { id: "flags", header: "Can change", meta: { align: "center" }, cell: ({ row }) => <EmployeeFlags employee={row.original} /> },
    {
      id: "allergies",
      header: "Allergies",
      meta: { align: "right" },
      cell: ({ row }) => {
        const n = row.original.allergens.length;
        return <span className={cn("num", n > 0 && "font-medium text-warning")}>{n}</span>;
      },
    },
    {
      id: "dietary",
      header: "Dietary",
      cell: ({ row }) => row.original.dietaryTags.map((t) => t.dietaryTag.name).join(", ") || <span className="text-muted-foreground">—</span>,
    },
  );
  return columns;
}
