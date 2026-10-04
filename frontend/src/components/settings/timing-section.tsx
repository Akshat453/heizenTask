"use client";

import { useState } from "react";
import { Field } from "@/components/app/field";
import { FormErrorAlert } from "@/components/app/form-error-alert";
import { FormSection } from "@/components/app/form-layout";
import { errorMessages } from "@/components/companies/queries";
import { Input } from "@/components/ui/input";
import type { PlatformSettings } from "@/lib/api";
import { useSaveSettings } from "./queries";
import { SectionSave } from "./section-save";

const minutesError = (v: string) => (/^\d+$/.test(v) && Number(v) <= 240 ? undefined : "Enter whole minutes from 0 to 240.");

export function TimingSection({ settings, canManage }: { settings: PlatformSettings; canManage: boolean }) {
  const saved = { buffer: String(settings.kitchenReadyBufferMinutes), risk: String(settings.atRiskWindowMinutes) };
  const [draft, setDraft] = useState(saved);
  const save = useSaveSettings("Kitchen timing saved");
  const bufferError = minutesError(draft.buffer);
  const riskError = minutesError(draft.risk);

  return (
    <FormSection id="timing" title="Kitchen timing" description="Each order must be kitchen-ready by: delivery time − the company's lead minutes − the kitchen buffer.">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="buffer" label="Kitchen buffer (minutes)" error={bufferError}
          hint="Time between kitchen-ready and planned dispatch. A larger buffer moves every kitchen deadline earlier on the board.">
          <Input id="buffer" type="number" inputMode="numeric" min={0} max={240} className="num w-28" disabled={!canManage} value={draft.buffer} onChange={(e) => setDraft({ ...draft, buffer: e.target.value })} />
        </Field>
        <Field id="risk" label="At-risk window (minutes)" error={riskError}
          hint="Unfinished work turns At risk this many minutes before its kitchen deadline, and Late at the deadline. 0 turns off At risk.">
          <Input id="risk" type="number" inputMode="numeric" min={0} max={240} className="num w-28" disabled={!canManage} value={draft.risk} onChange={(e) => setDraft({ ...draft, risk: e.target.value })} />
        </Field>
      </div>
      <FormErrorAlert messages={errorMessages(save.error)} />
      {canManage && (
        <SectionSave dirty={draft.buffer !== saved.buffer || draft.risk !== saved.risk} saving={save.isPending} invalid={Boolean(bufferError || riskError)}
          onDiscard={() => setDraft(saved)} onSave={() => save.mutate({ kitchenReadyBufferMinutes: Number(draft.buffer), atRiskWindowMinutes: Number(draft.risk) })} saveLabel="Save kitchen timing" />
      )}
    </FormSection>
  );
}
