"use client";

import { Info, Trash2 } from "lucide-react";
import { useState } from "react";
import { isoToLocalDate } from "@/components/app/date-range-filter";
import { FormErrorAlert } from "@/components/app/form-error-alert";
import { Panel } from "@/components/app/panel";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import type { CompanyDetail, DayOfWeek } from "@/lib/api";
import { formatBusinessDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { errorMessages, useUpdateCompany } from "./queries";

export const WEEK: { day: DayOfWeek; short: string }[] = [
  { day: "MONDAY", short: "Mon" }, { day: "TUESDAY", short: "Tue" }, { day: "WEDNESDAY", short: "Wed" },
  { day: "THURSDAY", short: "Thu" }, { day: "FRIDAY", short: "Fri" }, { day: "SATURDAY", short: "Sat" }, { day: "SUNDAY", short: "Sun" },
];

/** Seven toggle chips for the delivery days. */
export function WorkingDayChips({ value, onChange, disabled }: { value: DayOfWeek[]; onChange: (days: DayOfWeek[]) => void; disabled?: boolean }) {
  return (
    <div role="group" aria-label="Delivery days" className="flex flex-wrap gap-1.5">
      {WEEK.map(({ day, short }) => {
        const on = value.includes(day);
        return (
          <button
            key={day}
            type="button"
            aria-pressed={on}
            disabled={disabled}
            onClick={() => onChange(on ? value.filter((d) => d !== day) : WEEK.map((w) => w.day).filter((d) => d === day || value.includes(d)))}
            className={cn("h-9 w-14 rounded-lg border text-sm font-medium", on ? "border-primary bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground")}
          >
            {short}
          </button>
        );
      })}
    </div>
  );
}

export function CalendarTab({ company, canManage }: { company: CompanyDetail; canManage: boolean }) {
  const saved = WEEK.map((w) => w.day).filter((d) => company.workingDays.some((w) => w.dayOfWeek === d));
  const [days, setDays] = useState<DayOfWeek[]>(saved);
  const [holiday, setHoliday] = useState({ date: "", name: "" });
  const saveDays = useUpdateCompany(company.id, "Delivery days saved");
  const saveHolidays = useUpdateCompany(company.id, "Holidays saved");
  const holidays = company.holidays.map((h) => ({ id: h.id, date: h.date.slice(0, 10), name: h.name }));
  const daysDirty = days.join() !== saved.join();

  return (
    <div className="flex flex-col gap-6">
      <p className="flex items-start gap-2 rounded-lg border border-info/20 bg-info-soft p-3 text-sm">
        <Info className="mt-0.5 size-4 shrink-0 text-info" aria-hidden />
        The company calendar blocks delivery dates. It does not move the kitchen cut-off.
      </p>
      <Panel title="Delivery days" description="Orders can only be delivered on these days.">
        <WorkingDayChips value={days} onChange={setDays} disabled={!canManage} />
        <FormErrorAlert messages={errorMessages(saveDays.error)} />
        {canManage && (
          <Button className="mt-3 w-fit" disabled={!daysDirty || days.length === 0 || saveDays.isPending} onClick={() => saveDays.mutate({ workingDays: days })}>
            {saveDays.isPending ? "Saving…" : "Save delivery days"}
          </Button>
        )}
        {days.length === 0 && <p className="mt-2 text-xs text-danger">Choose at least one delivery day.</p>}
      </Panel>
      <Panel title="Holidays" description="No deliveries on these dates.">
        <div className="grid gap-6 lg:grid-cols-[auto_1fr]">
          <Calendar
            mode="multiple"
            selected={holidays.map((h) => isoToLocalDate(h.date))}
            className="w-fit rounded-lg border"
            disabled={() => true}
          />
          <div className="flex flex-col gap-3">
            {holidays.length === 0 ? (
              <p className="text-sm text-muted-foreground">No holidays set.</p>
            ) : (
              <ul className="divide-y rounded-lg border">
                {holidays.map((h) => (
                  <li key={h.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                    <span><span className="num">{formatBusinessDate(h.date, { withYear: true })}</span>{h.name && <span className="text-muted-foreground"> · {h.name}</span>}</span>
                    {canManage && (
                      <Button size="icon-sm" variant="ghost" aria-label={`Remove holiday ${h.date}`} disabled={saveHolidays.isPending}
                        onClick={() => saveHolidays.mutate({ holidays: holidays.filter((x) => x.id !== h.id) })}>
                        <Trash2 />
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {canManage && (
              <form
                className="flex flex-wrap items-end gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (holiday.date) saveHolidays.mutate({ holidays: [...holidays, { date: holiday.date, name: holiday.name.trim() || null }] }, { onSuccess: () => setHoliday({ date: "", name: "" }) });
                }}
              >
                <Input type="date" aria-label="Holiday date" value={holiday.date} onChange={(e) => setHoliday({ ...holiday, date: e.target.value })} className="num w-44" />
                <Input aria-label="Holiday name" placeholder="Name (optional)" value={holiday.name} onChange={(e) => setHoliday({ ...holiday, name: e.target.value })} className="w-52" />
                <Button type="submit" variant="outline" disabled={!holiday.date || saveHolidays.isPending}>Add holiday</Button>
              </form>
            )}
            <FormErrorAlert messages={errorMessages(saveHolidays.error)} />
          </div>
        </div>
      </Panel>
    </div>
  );
}
