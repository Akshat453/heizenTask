"use client";

import { ChevronLeft, ChevronRight, Maximize, Minimize, Search, X } from "lucide-react";
import { useEffect, useState } from "react";
import { addDays } from "@/components/app/date-range-filter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { formatBusinessDate, formatCount } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { StationTab } from "./board-model";
import type { useKitchenParams } from "./use-kitchen-params";

type KitchenParams = ReturnType<typeof useKitchenParams>;
type Props = KitchenParams & { today: string | null; tabs: StationTab[]; allRemaining: number };

const ALL = "__all";

function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div role="group" aria-label={label} className="inline-flex rounded-lg border bg-card p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn("rounded-md px-3 py-1.5 text-[0.875em] font-medium", value === o.value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function KitchenHeader({ params, setParams, date, today, tabs, allRemaining }: Props) {
  const [text, setText] = useState(params.q);
  const [synced, setSynced] = useState(params.q);
  if (params.q !== synced) {
    setSynced(params.q);
    setText(params.q);
  }
  const debounced = useDebouncedValue(text, 300);
  useEffect(() => {
    if (debounced !== params.q) void setParams({ q: debounced || null });
  }, [debounced, params.q, setParams]);

  const setDate = (next: string) => void setParams({ date: next === today ? null : next, combo: null });
  const filterSelect = <T extends string>(label: string, value: T | null, options: { value: T; label: string }[], key: "state" | "timing") => (
    <Select value={value ?? ALL} onValueChange={(v) => void setParams({ [key]: !v || v === ALL ? null : v })}>
      <SelectTrigger aria-label={label} className="h-10 min-w-36">
        <span className="text-muted-foreground">{label}:</span>
        <SelectValue>{(v: string) => (v === ALL ? "All" : (options.find((o) => o.value === v)?.label ?? v))}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>All</SelectItem>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon-lg" aria-label="Previous day" disabled={!date} onClick={() => date && setDate(addDays(date, -1))}>
            <ChevronLeft />
          </Button>
          <span className="num flex h-9 min-w-36 items-center justify-center gap-2 rounded-lg border bg-card px-3 font-semibold">
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
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Segmented
            label="View"
            value={params.view}
            onChange={(view) => void setParams({ view: view === "units" ? null : view })}
            options={[
              { value: "units", label: "By unit" },
              { value: "totals", label: "Prep totals" },
            ]}
          />
          <Button variant={params.wall ? "default" : "outline"} size="lg" onClick={() => void setParams({ wall: params.wall ? null : true })}>
            {params.wall ? <Minimize data-icon="inline-start" /> : <Maximize data-icon="inline-start" />}
            {params.wall ? "Exit wall mode" : "Wall mode"}
          </Button>
        </div>
      </div>

      <nav aria-label="Stations" className="flex gap-1 overflow-x-auto">
        {[{ key: ALL, name: "All", remaining: allRemaining }, ...tabs].map((tab) => {
          const active = (params.station ?? ALL) === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              aria-current={active ? "true" : undefined}
              onClick={() => void setParams({ station: tab.key === ALL ? null : tab.key, combo: null })}
              className={cn(
                "flex h-10 shrink-0 items-center gap-2 rounded-lg border px-3 text-[0.875em] font-medium",
                active ? "border-primary bg-accent text-accent-foreground" : "bg-card text-muted-foreground hover:text-foreground",
              )}
            >
              {tab.name}
              <span className="num rounded bg-muted px-1.5 text-[0.85em]" aria-label={`${tab.remaining} remaining`}>
                {formatCount(tab.remaining)}
              </span>
            </button>
          );
        })}
      </nav>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-72">
          <Search aria-hidden className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Order #, company or dish" aria-label="Search units" className="h-10 pl-8" />
        </div>
        {filterSelect("State", params.state, [
          { value: "NOT_STARTED", label: "Not started" },
          { value: "STARTED", label: "In progress" },
          { value: "DONE", label: "Done" },
        ], "state")}
        {filterSelect("Timing", params.timing, [
          { value: "LATE", label: "Late" },
          { value: "AT_RISK", label: "At risk" },
          { value: "ON_TRACK", label: "On track" },
        ], "timing")}
        {params.combo && (
          <span className="inline-flex h-8 items-center gap-1 rounded-md border bg-secondary pr-0.5 pl-2 text-[0.8125em] text-secondary-foreground">
            Combination: {params.combo.replaceAll(" | ", " · ")}
            <button type="button" aria-label="Clear combination filter" className="grid size-6 place-items-center rounded hover:bg-accent" onClick={() => void setParams({ combo: null })}>
              <X className="size-3.5" />
            </button>
          </span>
        )}
      </div>
    </div>
  );
}
