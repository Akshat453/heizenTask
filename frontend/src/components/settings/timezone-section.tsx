"use client";

import { Globe } from "lucide-react";
import { useState } from "react";
import { Field } from "@/components/app/field";
import { FormErrorAlert } from "@/components/app/form-error-alert";
import { FormSection } from "@/components/app/form-layout";
import { errorMessages } from "@/components/companies/queries";
import { Input } from "@/components/ui/input";
import type { PlatformSettings } from "@/lib/api";
import { useSaveSettings } from "./queries";
import { SectionSave } from "./section-save";

export function TimezoneSection({ settings, canManage }: { settings: PlatformSettings; canManage: boolean }) {
  const [zone, setZone] = useState(settings.businessTimezone);
  const save = useSaveSettings("Business timezone saved");
  return (
    <FormSection id="timezone" title="Business timezone" description="All dates, cut-offs and 'today' use this timezone.">
      {canManage ? (
        <Field id="tz" label="IANA timezone" hint="For example Asia/Kolkata. The server rejects unknown zones.">
          <Input id="tz" className="w-64" value={zone} maxLength={100} onChange={(e) => setZone(e.target.value)} />
        </Field>
      ) : (
        <p className="flex items-center gap-2 text-sm font-medium"><Globe className="size-4 text-muted-foreground" aria-hidden />{settings.businessTimezone}</p>
      )}
      <FormErrorAlert messages={errorMessages(save.error)} />
      {canManage && (
        <SectionSave dirty={zone.trim() !== settings.businessTimezone} saving={save.isPending} invalid={!zone.trim()}
          onDiscard={() => setZone(settings.businessTimezone)} onSave={() => save.mutate({ businessTimezone: zone.trim() })} saveLabel="Save timezone" />
      )}
    </FormSection>
  );
}
