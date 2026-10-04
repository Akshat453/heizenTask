"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Tags } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { EmptyState } from "@/components/app/empty-state";
import { ErrorState } from "@/components/app/error-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { describeError } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { refKey, type RefKind, type RefRow } from "./reference-config";

function NameCell({ row, kind, canManage }: { row: RefRow; kind: RefKind; canManage: boolean }) {
  const queryClient = useQueryClient();
  const [value, setValue] = useState(row.name);
  const [error, setError] = useState<string | null>(null);
  const save = useMutation({
    mutationFn: (body: { name?: string; displayOrder?: number; isActive?: boolean }) => kind.update(row.id, body),
    onSuccess: (_r, body) => {
      setError(null);
      toast.success(body.isActive === undefined ? `${kind.singular[0].toUpperCase()}${kind.singular.slice(1)} renamed` : body.isActive ? "Activated" : "Deactivated");
      void queryClient.invalidateQueries({ queryKey: refKey(kind.key) });
    },
    onError: (e) => setError(describeError(e)),
  });
  const commit = () => {
    const name = value.trim();
    if (!name || name === row.name) return setValue(row.name);
    save.mutate({ name });
  };
  return (
    <tr className="border-b last:border-0">
      <td className="px-3 py-1.5 align-top">
        {canManage ? (
          <Input
            aria-label={`${kind.singular} name`}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
              if (e.key === "Escape") setValue(row.name);
            }}
            disabled={save.isPending}
            aria-invalid={Boolean(error)}
            className="h-9 max-w-sm"
          />
        ) : (
          <span className="leading-9">{row.name}</span>
        )}
        {error && <p className="mt-1 text-xs text-danger">{error}</p>}
      </td>
      {kind.ordered && <td className="num px-3 py-1.5 text-right align-top leading-9">{row.displayOrder}</td>}
      <td className="px-3 py-1.5 text-right align-top">
        <span className="inline-flex h-9 items-center gap-2">
          <span className={cn("text-xs", row.isActive ? "text-success" : "text-muted-foreground")}>{row.isActive ? "Active" : "Inactive"}</span>
          {canManage && (
            <Switch aria-label={`${row.name} active`} checked={row.isActive} disabled={save.isPending} onCheckedChange={(isActive) => save.mutate({ isActive })} />
          )}
        </span>
      </td>
    </tr>
  );
}

export function ReferenceTable({ kind, canManage }: { kind: RefKind; canManage: boolean }) {
  const queryClient = useQueryClient();
  const rows = useQuery({ queryKey: refKey(kind.key), queryFn: kind.list });
  const [name, setName] = useState("");
  const [addError, setAddError] = useState<string | null>(null);
  const nextOrder = Math.max(0, ...(rows.data ?? []).map((r) => r.displayOrder ?? 0)) + 1;
  const add = useMutation({
    mutationFn: () => kind.create({ name: name.trim(), displayOrder: nextOrder }),
    onSuccess: () => {
      toast.success(`${kind.singular[0].toUpperCase()}${kind.singular.slice(1)} added`);
      setName("");
      setAddError(null);
      void queryClient.invalidateQueries({ queryKey: refKey(kind.key) });
    },
    onError: (e) => setAddError(describeError(e)),
  });

  if (rows.isLoading) return <Skeleton className="h-64" />;
  if (rows.error) return <ErrorState error={rows.error} title={`Could not load ${kind.label.toLowerCase()}`} onRetry={() => void rows.refetch()} />;
  const data = [...(rows.data ?? [])].sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0) || a.name.localeCompare(b.name));

  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      {canManage && (
        <form
          className="flex flex-col gap-1 border-b p-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim()) add.mutate();
          }}
        >
          <div className="flex gap-2">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={`New ${kind.singular}`} aria-label={`New ${kind.singular} name`} className="h-9 max-w-sm" />
            <Button type="submit" disabled={!name.trim() || add.isPending}>
              <Plus data-icon="inline-start" /> Add {kind.singular}
            </Button>
          </div>
          {addError && <p className="text-xs text-danger">{addError}</p>}
        </form>
      )}
      {data.length === 0 ? (
        <EmptyState icon={Tags} title={`No ${kind.label.toLowerCase()} yet`} description={canManage ? `Add the first ${kind.singular} above.` : "An admin can add them."} />
      ) : (
        <table className="w-full text-sm">
          <thead className="border-b">
            <tr>
              <th scope="col" className="label-caps h-9 px-3 text-left text-muted-foreground">Name</th>
              {kind.ordered && <th scope="col" className="label-caps px-3 text-right text-muted-foreground">Order</th>}
              <th scope="col" className="label-caps px-3 text-right text-muted-foreground">Status</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <NameCell key={`${row.id}-${row.name}`} row={row} kind={kind} canManage={canManage} />
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
