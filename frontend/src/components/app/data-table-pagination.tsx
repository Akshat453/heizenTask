"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { PaginatedResponse } from "@/lib/api";
import { formatCount } from "@/lib/format";

const PAGE_SIZES = [10, 25, 50, 100];

type Props = {
  pagination: PaginatedResponse<unknown>["pagination"];
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
};

/** "1-25 of 312" footer with page-size select and previous/next. */
export function DataTablePagination({ pagination, onPageChange, onPageSizeChange }: Props) {
  const { page, pageSize, totalItems, totalPages } = pagination;
  const first = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, totalItems);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t px-3 py-2 text-sm">
      <p className="num text-muted-foreground">
        {formatCount(first)}–{formatCount(last)} of {formatCount(totalItems)}
      </p>
      <div className="flex items-center gap-2">
        {onPageSizeChange && (
          <label className="flex items-center gap-2 text-muted-foreground">
            <span className="hidden sm:inline">Rows per page</span>
            <Select value={String(pageSize)} onValueChange={(value) => value && onPageSizeChange(Number(value))}>
              <SelectTrigger size="sm" className="w-18" aria-label="Rows per page">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZES.map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
        )}
        <Button variant="outline" size="icon-sm" aria-label="Previous page" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          <ChevronLeft />
        </Button>
        <span className="num min-w-16 text-center text-muted-foreground">
          {page} / {Math.max(totalPages, 1)}
        </span>
        <Button variant="outline" size="icon-sm" aria-label="Next page" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
          <ChevronRight />
        </Button>
      </div>
    </div>
  );
}
