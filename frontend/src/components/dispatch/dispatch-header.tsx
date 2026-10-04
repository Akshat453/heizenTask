"use client";

import { ChevronLeft, ChevronRight, RefreshCcw, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { addDays } from "@/components/app/date-range-filter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import type { DriverOption } from "@/lib/api";
import { formatBusinessDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { NO_DRIVER } from "./dispatch-model";
import type { useDispatchParams } from "./use-dispatch-params";

type Props = ReturnType<typeof useDispatchParams> & {
  today: string | null;
  drivers: DriverOption[];
  canRebuild: boolean;
  onRebuild: () => void;
};
const ALL = "__all";

export function DispatchHeader({ params, setParams, date, today, drivers, canRebuild, onRebuild }: Props) {
  const [text, setText] = useState(params.q);
  const [synced, setSynced] = useState(params.q);
  if (params.q !== synced) {
    setSynced(params.q);
    setText(params.q);
  }
  const debounced = useDebouncedValue(text, 300);
  useEffect(() => {
    if (debounced !== params.q) void setParams({ q: debounced || null, page: null });
  }, [debounced, params.q, setParams]);
  const setDate = (next: string) => void setParams({ date: next === today ? null : next, page: null });

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1">
        <Button variant="outline" size="icon-lg" aria-label="Previous day" disabled={!date} onClick={() => date && setDate(addDays(date, -1))}>
          <ChevronLeft />
        </Button>
        <span className="num flex h-9 min-w-32 items-center justify-center gap-2 rounded-lg border bg-card px-3 font-semibold">
          {date === today && <span aria-hidden className="size-2 rounded-full bg-saffron" />}
          {date ? formatBusinessDate(date) : "…"}
        </span>
        <Button variant="outline" size="icon-lg" aria-label="Next day" disabled={!date} onClick={() => date && setDate(addDays(date, 1))}>
          <ChevronRight />
        </Button>
        <Button variant="outline" size="lg" disabled={!today || date === today} onClick={() => today && setDate(today)}>
          Today
        </Button>
      </div>
      <div className="relative w-full sm:w-64">
        <Search aria-hidden className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Company, address or driver" aria-label="Search drops" className="h-9 pl-8" />
      </div>
      <Select value={params.driver ?? ALL} onValueChange={(v) => void setParams({ driver: !v || v === ALL ? null : String(v), page: null })}>
        <SelectTrigger aria-label="Driver filter" className="h-9 min-w-40">
          <span className="text-muted-foreground">Driver:</span>
          <SelectValue>{(v: string) => (v === ALL ? "All" : v === NO_DRIVER ? "No driver" : (drivers.find((d) => d.id === v)?.name ?? "Driver"))}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All</SelectItem>
          <SelectItem value={NO_DRIVER}>No driver</SelectItem>
          {drivers.map((d) => (
            <SelectItem key={d.id} value={d.id}>
              {d.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="ml-auto flex items-center gap-2">
        <div role="group" aria-label="View" className="inline-flex rounded-lg border bg-card p-0.5">
          {(["board", "table"] as const).map((v) => (
            <button
              key={v}
              type="button"
              aria-pressed={params.view === v}
              onClick={() => void setParams({ view: v === "board" ? null : v })}
              className={cn("rounded-md px-3 py-1.5 text-sm font-medium capitalize", params.view === v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
            >
              {v}
            </button>
          ))}
        </div>
        {canRebuild && (
          <Button variant="outline" onClick={onRebuild}>
            <RefreshCcw data-icon="inline-start" /> Rebuild drops
          </Button>
        )}
      </div>
    </div>
  );
}
