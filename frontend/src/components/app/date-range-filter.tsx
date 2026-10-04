"use client";

import { CalendarRange } from "lucide-react";
import { useState } from "react";
import type { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatBusinessDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export type IsoDateRange = { from: string | null; to: string | null };

type Preset = { key: string; label: string; range: (today: string) => IsoDateRange };

/** Calendar-date arithmetic on YYYY-MM-DD strings (UTC, so no timezone shift). */
export function addDays(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

function startOfWeek(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0 = Sunday
  return addDays(isoDate, -((dow + 6) % 7)); // weeks start on Monday
}

const PRESETS: Preset[] = [
  { key: "today", label: "Today", range: (t) => ({ from: t, to: t }) },
  { key: "tomorrow", label: "Tomorrow", range: (t) => ({ from: addDays(t, 1), to: addDays(t, 1) }) },
  { key: "week", label: "This week", range: (t) => ({ from: startOfWeek(t), to: addDays(startOfWeek(t), 6) }) },
  { key: "next7", label: "Next 7 days", range: (t) => ({ from: t, to: addDays(t, 6) }) },
  { key: "last7", label: "Last 7 days", range: (t) => ({ from: addDays(t, -6), to: t }) },
];

/** YYYY-MM-DD -> local Date at midnight (react-day-picker works in local calendar days). */
export const isoToLocalDate = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d); // react-day-picker works in local calendar days
};
/** Local calendar Date -> YYYY-MM-DD (no timezone conversion). */
export const localDateToIso = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

type DateRangeFilterProps = {
  value: IsoDateRange;
  onChange: (value: IsoDateRange) => void;
  /** Backend business date (useBusinessClock). Presets are disabled until it is known. */
  today: string | null;
  label?: string;
};

function describe(value: IsoDateRange): string | null {
  if (!value.from && !value.to) return null;
  if (value.from && value.from === value.to) return formatBusinessDate(value.from);
  return `${value.from ? formatBusinessDate(value.from) : "…"} – ${value.to ? formatBusinessDate(value.to) : "…"}`;
}

export function DateRangeFilter({ value, onChange, today, label = "Delivery date" }: DateRangeFilterProps) {
  const [open, setOpen] = useState(false);
  const selected: DateRange | undefined = value.from
    ? { from: isoToLocalDate(value.from), to: value.to ? isoToLocalDate(value.to) : undefined }
    : undefined;
  const activePreset = today
    ? PRESETS.find((p) => {
        const r = p.range(today);
        return r.from === value.from && r.to === value.to;
      })
    : undefined;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={<Button variant="outline" className="justify-start" />}>
        <CalendarRange data-icon="inline-start" />
        <span className="text-muted-foreground">{label}:</span>
        <span>{activePreset?.label ?? describe(value) ?? "Any"}</span>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0 shadow-soft">
        <div className="flex flex-col sm:flex-row">
          <div className="flex flex-row flex-wrap gap-1 border-b p-2 sm:w-36 sm:flex-col sm:border-r sm:border-b-0">
            {PRESETS.map((preset) => (
              <Button
                key={preset.key}
                size="sm"
                variant="ghost"
                disabled={!today}
                className={cn("justify-start", activePreset?.key === preset.key && "bg-accent")}
                onClick={() => {
                  if (!today) return;
                  onChange(preset.range(today));
                  setOpen(false);
                }}
              >
                {preset.label}
              </Button>
            ))}
            <Button size="sm" variant="ghost" className="justify-start text-muted-foreground" onClick={() => onChange({ from: null, to: null })}>
              Clear
            </Button>
          </div>
          <Calendar
            mode="range"
            selected={selected}
            defaultMonth={selected?.from ?? (today ? isoToLocalDate(today) : undefined)}
            today={today ? isoToLocalDate(today) : undefined}
            onSelect={(range) =>
              onChange({ from: range?.from ? localDateToIso(range.from) : null, to: range?.to ? localDateToIso(range.to) : null })
            }
            numberOfMonths={1}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}
