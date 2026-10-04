"use client";

import { useMutation } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { isoToLocalDate } from "@/components/app/date-range-filter";
import { FormErrorAlert } from "@/components/app/form-error-alert";
import { FormSection } from "@/components/app/form-layout";
import { WEEK, WorkingDayChips } from "@/components/companies/calendar-tab";
import { errorMessages } from "@/components/companies/queries";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { settingsApi, type DayOfWeek } from "@/lib/api";
import { formatBusinessDate } from "@/lib/format";
import { useInvalidateSettings } from "./queries";
import { SectionSave } from "./section-save";

type Holiday = { id: string; date: string; name: string | null };

export function KitchenCalendarSection({ workingDays, holidays, canManage }: { workingDays: DayOfWeek[]; holidays: Holiday[]; canManage: boolean }) {
  const saved = WEEK.map((w) => w.day).filter((d) => workingDays.includes(d));
  const [days, setDays] = useState<DayOfWeek[]>(saved);
  const [draft, setDraft] = useState({ date: "", name: "" });
  const invalidate = useInvalidateSettings();
  const saveDays = useMutation({
    mutationFn: () => settingsApi.upsertWorkingDays(days),
    onSuccess: () => toast.success("Kitchen working days saved"),
    onSettled: invalidate,
  });
  const addHoliday = useMutation({
    mutationFn: () => settingsApi.createHoliday({ date: draft.date, ...(draft.name.trim() ? { name: draft.name.trim() } : {}) }),
    onSuccess: () => { toast.success("Kitchen holiday added"); setDraft({ date: "", name: "" }); },
    onSettled: invalidate,
  });
  const removeHoliday = useMutation({
    mutationFn: (id: string) => settingsApi.deleteHoliday(id),
    onSuccess: () => toast.success("Kitchen holiday removed"),
    onSettled: invalidate,
  });
  const list = holidays.map((h) => ({ ...h, date: h.date.slice(0, 10) })).sort((a, b) => a.date.localeCompare(b.date));

  return (
    <FormSection id="calendar" title="Kitchen calendar" description="Cut-off counts back only over kitchen working days, skipping kitchen holidays. Company delivery calendars are set on each company.">
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium">Working days</p>
        <WorkingDayChips label="Kitchen working days" value={days} onChange={setDays} disabled={!canManage} />
        {days.length === 0 && <p className="text-xs text-danger">Choose at least one working day.</p>}
        <FormErrorAlert messages={errorMessages(saveDays.error)} />
        {canManage && (
          <SectionSave dirty={days.join() !== saved.join()} saving={saveDays.isPending} invalid={days.length === 0}
            onDiscard={() => setDays(saved)} onSave={() => saveDays.mutate()} saveLabel="Save working days" />
        )}
      </div>
      <div className="grid gap-6 border-t pt-4 lg:grid-cols-[auto_1fr]">
        <Calendar mode="multiple" selected={list.map((h) => isoToLocalDate(h.date))} className="w-fit rounded-lg border" disabled={() => true} aria-label="Kitchen holidays calendar" />
        <div className="flex flex-col gap-3">
          <p className="text-sm font-medium">Kitchen holidays</p>
          {list.length === 0 ? (
            <p className="text-sm text-muted-foreground">No kitchen holidays. Add one to skip it when counting back to cut-off.</p>
          ) : (
            <ul className="divide-y rounded-lg border">
              {list.map((h) => (
                <li key={h.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                  <span><span className="num">{formatBusinessDate(h.date, { withYear: true })}</span>{h.name && <span className="text-muted-foreground"> · {h.name}</span>}</span>
                  {canManage && (
                    <Button size="icon-sm" variant="ghost" aria-label={`Remove kitchen holiday ${h.date}`} disabled={removeHoliday.isPending} onClick={() => removeHoliday.mutate(h.id)}>
                      <Trash2 />
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
          {canManage && (
            <form className="flex flex-wrap items-end gap-2" onSubmit={(e) => { e.preventDefault(); if (draft.date) addHoliday.mutate(); }}>
              <Input type="date" aria-label="Holiday date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} className="num w-44" />
              <Input aria-label="Holiday name" placeholder="Name (optional)" maxLength={200} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className="w-52" />
              <Button type="submit" variant="outline" disabled={!draft.date || addHoliday.isPending}>Add holiday</Button>
            </form>
          )}
          <FormErrorAlert messages={[...errorMessages(addHoliday.error), ...errorMessages(removeHoliday.error)]} />
        </div>
      </div>
    </FormSection>
  );
}
