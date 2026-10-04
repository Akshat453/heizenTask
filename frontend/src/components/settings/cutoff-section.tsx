"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { addDays } from "@/components/app/date-range-filter";
import { Field } from "@/components/app/field";
import { FormErrorAlert } from "@/components/app/form-error-alert";
import { FormSection } from "@/components/app/form-layout";
import { errorMessages } from "@/components/companies/queries";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useBusinessClock } from "@/hooks/use-business-clock";
import { businessTimeApi, type PlatformSettings } from "@/lib/api";
import { formatBusinessDate, formatBusinessTime, formatTimeOfDay } from "@/lib/format";
import { useSaveSettings } from "./queries";
import { SectionSave } from "./section-save";

const PREVIEW_DAYS = 5;
const weekday = (iso: string) => new Intl.DateTimeFormat("en-IN", { timeZone: "UTC", weekday: "long" }).format(new Date(`${iso}T00:00:00Z`));

/** Next delivery dates and when they lock, straight from GET /business-time/cutoff/:date (saved settings). */
function CutoffPreview({ count, time }: { count: number; time: string }) {
  const { businessDate: today, timeZone } = useBusinessClock();
  const rows = useQuery({
    queryKey: ["cutoff-preview", today, count, time],
    enabled: Boolean(today),
    queryFn: () => Promise.all(Array.from({ length: PREVIEW_DAYS }, (_, i) => businessTimeApi.cutoff(addDays(today!, i + 1)))),
  });
  if (rows.isLoading || !today) return <Skeleton className="h-48" />;
  if (rows.error || !rows.data) return <FormErrorAlert title="Could not load the cut-off preview" messages={errorMessages(rows.error)} />;
  const example = rows.data.find((r) => r.cutoffDate !== r.deliveryDate) ?? rows.data[0];
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium">What this means</p>
      <p className="text-sm text-muted-foreground">
        With {count} working {count === 1 ? "day" : "days"} at {time}, a {weekday(example.deliveryDate)} delivery locks on {weekday(example.cutoffDate)} at {formatBusinessTime(example.cutoffInstant, timeZone)}.
      </p>
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow><TableHead>Delivery date</TableHead><TableHead>Orders lock at</TableHead></TableRow>
          </TableHeader>
          <TableBody>
            {rows.data.map((r) => (
              <TableRow key={r.deliveryDate}>
                <TableCell className="num">{formatBusinessDate(r.deliveryDate)}</TableCell>
                <TableCell className="num">
                  {formatBusinessDate(r.cutoffDate)}, {formatBusinessTime(r.cutoffInstant, timeZone)}
                  {r.passed && <span className="text-muted-foreground"> · already locked</span>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export function CutoffSection({ settings, canManage }: { settings: PlatformSettings; canManage: boolean }) {
  const saved = { time: formatTimeOfDay(settings.cutoffTime), count: String(settings.cutoffWorkingDayCount) };
  const [draft, setDraft] = useState(saved);
  const save = useSaveSettings("Cut-off saved");
  const count = Number(draft.count);
  const countError = /^\d+$/.test(draft.count) && count <= 30 ? undefined : "Enter a whole number from 0 to 30.";
  const timeError = /^([01]\d|2[0-3]):[0-5]\d$/.test(draft.time) ? undefined : "Enter a time as HH:MM.";

  return (
    <FormSection id="cutoff" title="Cut-off" description="Placed orders are confirmed, and drafts cancelled, when their delivery date's cut-off passes.">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="cutoff-time" label="Cut-off time" hint="Business-local time on the cut-off day." error={timeError}>
          <Input id="cutoff-time" type="time" className="num w-36" disabled={!canManage} value={draft.time} onChange={(e) => setDraft({ ...draft, time: e.target.value })} />
        </Field>
        <Field id="cutoff-days" label="Kitchen working days before delivery" hint="0 means cut-off is on the delivery date itself." error={countError}>
          <Input id="cutoff-days" type="number" inputMode="numeric" min={0} max={30} className="num w-28" disabled={!canManage} value={draft.count} onChange={(e) => setDraft({ ...draft, count: e.target.value })} />
        </Field>
      </div>
      <FormErrorAlert messages={errorMessages(save.error)} />
      {canManage && (
        <SectionSave dirty={draft.time !== saved.time || draft.count !== saved.count} saving={save.isPending} invalid={Boolean(countError || timeError)}
          onDiscard={() => setDraft(saved)} onSave={() => save.mutate({ cutoffTime: draft.time, cutoffWorkingDayCount: count })} saveLabel="Save cut-off" />
      )}
      <div className="border-t pt-4">
        <CutoffPreview count={settings.cutoffWorkingDayCount} time={saved.time} />
        <p className="mt-2 text-xs text-muted-foreground">The preview uses the saved settings; save to update it.</p>
      </div>
    </FormSection>
  );
}
