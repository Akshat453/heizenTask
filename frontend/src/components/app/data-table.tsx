"use client";

import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type OnChangeFn,
  type RowData,
  type RowSelectionState,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown, Columns3, Rows3 } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import type { PaginatedResponse } from "@/lib/api";
import { cn } from "@/lib/utils";
import { DataTablePagination } from "./data-table-pagination";
import { ErrorState } from "./error-state";

declare module "@tanstack/react-table" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- generic names must match the library declaration
  interface ColumnMeta<TData extends RowData, TValue> {
    /** Text left (default), numbers right, badges centre. */
    align?: "left" | "right" | "center";
    /** Label for the column-visibility menu when the header is not a string. */
    label?: string;
  }
}

const ALIGN = { left: "text-left", right: "text-right", center: "text-center" } as const;

export type DataTableProps<T> = {
  columns: ColumnDef<T, unknown>[];
  /** Current page rows from the server. */
  data: T[] | undefined;
  pagination?: PaginatedResponse<T>["pagination"];
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  /** Server-side sorting (manual). Omit to disable sorting. */
  sorting?: SortingState;
  onSortingChange?: OnChangeFn<SortingState>;
  getRowId: (row: T) => string;
  onRowClick?: (row: T) => void;
  /** Enables the checkbox column. */
  rowSelection?: RowSelectionState;
  onRowSelectionChange?: OnChangeFn<RowSelectionState>;
  isLoading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  /** Rendered when the page has no rows. */
  empty: ReactNode;
  /** Left side of the toolbar (e.g. a FilterBar). */
  toolbar?: ReactNode;
  className?: string;
};

export function DataTable<T>({
  columns,
  data,
  pagination,
  onPageChange,
  onPageSizeChange,
  sorting,
  onSortingChange,
  getRowId,
  onRowClick,
  rowSelection,
  onRowSelectionChange,
  isLoading,
  error,
  onRetry,
  empty,
  toolbar,
  className,
}: DataTableProps<T>) {
  const [compact, setCompact] = useState(false);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const selectable = Boolean(onRowSelectionChange);

  const allColumns = useMemo<ColumnDef<T, unknown>[]>(() => {
    if (!selectable) return columns;
    const select: ColumnDef<T, unknown> = {
      id: "__select",
      enableHiding: false,
      enableSorting: false,
      meta: { align: "center" },
      header: ({ table }) => (
        <Checkbox
          aria-label="Select all rows on this page"
          checked={table.getIsAllPageRowsSelected()}
          indeterminate={table.getIsSomePageRowsSelected()}
          onCheckedChange={(checked) => table.toggleAllPageRowsSelected(checked)}
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          aria-label="Select row"
          checked={row.getIsSelected()}
          disabled={!row.getCanSelect()}
          onClick={(event) => event.stopPropagation()}
          onCheckedChange={(checked) => row.toggleSelected(checked)}
        />
      ),
    };
    return [select, ...columns];
  }, [columns, selectable]);

  // TanStack Table returns non-memoizable functions; the React Compiler skips this component.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: data ?? [],
    columns: allColumns,
    getRowId,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
    enableSorting: Boolean(onSortingChange),
    enableRowSelection: selectable,
    state: {
      sorting: sorting ?? [],
      rowSelection: rowSelection ?? {},
      columnVisibility,
    },
    onSortingChange,
    onRowSelectionChange,
    onColumnVisibilityChange: setColumnVisibility,
  });

  const rowHeight = compact ? "h-9" : "h-11";
  const visibleColumnCount = table.getVisibleLeafColumns().length;
  const rows = table.getRowModel().rows;
  const hideable = table.getAllLeafColumns().filter((c) => c.getCanHide());

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">{toolbar}</div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            aria-pressed={compact}
            onClick={() => setCompact((value) => !value)}
          >
            <Rows3 data-icon="inline-start" />
            {compact ? "Comfortable" : "Compact"}
          </Button>
          {hideable.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="ghost" size="sm" />}>
                <Columns3 data-icon="inline-start" />
                Columns
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuGroup>
                  <DropdownMenuLabel>Show columns</DropdownMenuLabel>
                  {hideable.map((column) => (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      checked={column.getIsVisible()}
                      onCheckedChange={(checked) => column.toggleVisibility(checked)}
                    >
                      {column.columnDef.meta?.label ??
                        (typeof column.columnDef.header === "string" ? column.columnDef.header : column.id)}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {error ? (
        <ErrorState error={error} title="Could not load this list" onRetry={onRetry} />
      ) : (
        <div className="overflow-hidden rounded-lg border bg-card">
          <div className="max-h-[calc(100dvh-16rem)] overflow-auto">
            <table className="w-full caption-bottom text-[13px]">
              <thead className="sticky top-0 z-10 bg-card shadow-[inset_0_-1px_0_var(--border)]">
                {table.getHeaderGroups().map((group) => (
                  <tr key={group.id}>
                    {group.headers.map((header) => {
                      const align = header.column.columnDef.meta?.align ?? "left";
                      const sorted = header.column.getIsSorted();
                      const SortIcon = sorted === "asc" ? ArrowUp : sorted === "desc" ? ArrowDown : ArrowUpDown;
                      return (
                        <th
                          key={header.id}
                          scope="col"
                          aria-sort={sorted === "asc" ? "ascending" : sorted === "desc" ? "descending" : undefined}
                          className={cn("label-caps h-9 px-3 whitespace-nowrap text-muted-foreground", ALIGN[align])}
                        >
                          {header.isPlaceholder ? null : header.column.getCanSort() ? (
                            <button
                              type="button"
                              onClick={header.column.getToggleSortingHandler()}
                              className="inline-flex items-center gap-1 rounded-sm hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                            >
                              {flexRender(header.column.columnDef.header, header.getContext())}
                              <SortIcon aria-hidden className={cn("size-3", !sorted && "opacity-40")} />
                            </button>
                          ) : (
                            flexRender(header.column.columnDef.header, header.getContext())
                          )}
                        </th>
                      );
                    })}
                  </tr>
                ))}
              </thead>
              <tbody>
                {isLoading && !data
                  ? Array.from({ length: 8 }, (_, i) => (
                      <tr key={i} className={cn("border-b last:border-0", rowHeight)}>
                        {Array.from({ length: visibleColumnCount }, (_, j) => (
                          <td key={j} className="px-3">
                            <Skeleton className="h-4 w-full max-w-40" />
                          </td>
                        ))}
                      </tr>
                    ))
                  : rows.map((row) => (
                      <tr
                        key={row.id}
                        data-state={row.getIsSelected() ? "selected" : undefined}
                        onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                        className={cn(
                          "border-b transition-colors last:border-0 data-[state=selected]:bg-accent",
                          rowHeight,
                          onRowClick && "cursor-pointer hover:bg-muted/60",
                        )}
                      >
                        {row.getVisibleCells().map((cell) => (
                          <td
                            key={cell.id}
                            className={cn("px-3 align-middle", ALIGN[cell.column.columnDef.meta?.align ?? "left"])}
                          >
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </td>
                        ))}
                      </tr>
                    ))}
              </tbody>
            </table>
            {!isLoading && rows.length === 0 && <div className="border-t">{empty}</div>}
          </div>
          {pagination && onPageChange && (
            <DataTablePagination pagination={pagination} onPageChange={onPageChange} onPageSizeChange={onPageSizeChange} />
          )}
        </div>
      )}
    </div>
  );
}
