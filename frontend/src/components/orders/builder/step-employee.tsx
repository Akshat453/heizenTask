"use client";

import { Lock, TriangleAlert } from "lucide-react";
import { EntityCombobox, type ComboboxItem } from "@/components/app/entity-combobox";
import { isoToLocalDate, localDateToIso } from "@/components/app/date-range-filter";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useBusinessClock } from "@/hooks/use-business-clock";
import { employeesApi, type DayOfWeek } from "@/lib/api";
import { businessDateOf, formatBusinessDate, formatBusinessTime } from "@/lib/format";
import type { BuilderData } from "./use-builder-data";

const DAYS: DayOfWeek[] = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];

type Props = {
  editing: boolean;
  employee: ComboboxItem | null;
  onEmployee: (item: ComboboxItem | null) => void;
  date: string | null;
  onDate: (date: string | null) => void;
  data: BuilderData;
};

export function StepEmployee({ editing, employee, onEmployee, date, onDate, data }: Props) {
  const { businessDate: today, timeZone } = useBusinessClock();
  const company = data.company.data;
  const details = data.employee.data;
  const cutoffs = data.cutoffs.data;
  const holidays = new Set((company?.holidays ?? []).map((h) => h.date.slice(0, 10)));
  const workingDays = new Set((company?.workingDays ?? []).map((d) => d.dayOfWeek));

  /** Calendar hints from the company calendar and the API's cut-offs; the server re-validates on save. */
  const unavailable = (iso: string) => {
    if (today && iso < today) return true;
    const dow = DAYS[new Date(`${iso}T00:00:00Z`).getUTCDay()];
    if (company && workingDays.size > 0 && !workingDays.has(dow)) return true;
    if (holidays.has(iso)) return true;
    return cutoffs?.get(iso)?.passed ?? false;
  };
  const cutoff = date ? cutoffs?.get(date) : undefined;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex max-w-md flex-col gap-1.5">
        <Label>Employee</Label>
        {editing ? (
          <p className="flex items-center gap-2 text-sm">
            <Lock className="size-3.5 text-muted-foreground" aria-hidden /> {employee?.label}
            <span className="text-muted-foreground">(cannot change on an existing order)</span>
          </p>
        ) : (
          <EntityCombobox
            label="Employee"
            placeholder="Search by name or email"
            queryKey="employees"
            value={employee}
            onChange={(item) => {
              onEmployee(item);
              onDate(null);
            }}
            search={async (term) =>
              (await employeesApi.list({ search: term || undefined, pageSize: 10 })).data.map((e) => ({
                id: e.id,
                label: e.name,
                description: [e.email, e.company.name].filter(Boolean).join(" · "),
              }))
            }
          />
        )}
      </div>

      {details && (details.allergens.length > 0 || details.dietaryTags.length > 0) && (
        <div role="note" className="flex max-w-2xl gap-3 rounded-lg border border-warning/30 bg-warning-soft p-3 text-sm">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
          <div>
            <p className="font-medium text-warning">Preferences for {details.name} (informational, never blocks ordering)</p>
            <p className="mt-1">
              {details.allergens.length > 0 && <>Allergies: {details.allergens.map((a) => a.allergen.name).join(", ")}. </>}
              {details.dietaryTags.length > 0 && <>Dietary: {details.dietaryTags.map((t) => t.dietaryTag.name).join(", ")}.</>}
            </p>
          </div>
        </div>
      )}

      {employee && (
        <div className="flex flex-col gap-1.5">
          <Label>Delivery date</Label>
          {editing ? (
            <p className="flex items-center gap-2 text-sm">
              <Lock className="size-3.5 text-muted-foreground" aria-hidden />
              <span className="num">{date && formatBusinessDate(date, { withYear: true })}</span>
              <span className="text-muted-foreground">(the delivery date cannot change after saving)</span>
            </p>
          ) : data.company.isLoading || data.cutoffs.isLoading ? (
            <Skeleton className="h-72 w-72" />
          ) : (
            <div className="w-fit rounded-lg border bg-card">
              <Calendar
                mode="single"
                selected={date ? isoToLocalDate(date) : undefined}
                onSelect={(day) => onDate(day ? localDateToIso(day) : null)}
                defaultMonth={date ? isoToLocalDate(date) : today ? isoToLocalDate(today) : undefined}
                today={today ? isoToLocalDate(today) : undefined}
                disabled={(day) => unavailable(localDateToIso(day))}
              />
            </div>
          )}
          <p className="text-sm text-muted-foreground">
            {date && cutoff ? (
              <>
                Orders for <span className="num text-foreground">{formatBusinessDate(date)}</span> lock{" "}
                <span className="num text-foreground">
                  {formatBusinessDate(businessDateOf(cutoff.cutoffInstant, timeZone))}, {formatBusinessTime(cutoff.cutoffInstant, timeZone)}
                </span>
                .
              </>
            ) : (
              "Greyed-out days are company non-working days, holidays or past their cut-off."
            )}
          </p>
        </div>
      )}
    </div>
  );
}
