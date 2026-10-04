"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Field } from "@/components/app/field";
import { FormErrorAlert } from "@/components/app/form-error-alert";
import { Panel } from "@/components/app/panel";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { referenceDataApi, staffApi, type CompanyDetail } from "@/lib/api";
import { formatTimeOfDay } from "@/lib/format";
import { P } from "@/lib/permissions";
import { errorMessages, useUpdateCompany } from "./queries";

const NO_DRIVER = "__none";

export function DeliveryTab({ company, canManage }: { company: CompanyDetail; canManage: boolean }) {
  const { can } = useAuth();
  const initial = {
    defaultDeliveryTime: formatTimeOfDay(company.defaultDeliveryTime),
    deliveryLeadMinutes: String(company.deliveryLeadMinutes),
    defaultPackagingTypeId: company.defaultPackagingTypeId,
    defaultDriverStaffUserId: company.defaultDriver?.id ?? null,
    driverInstructions: company.driverInstructions ?? "",
  };
  const [form, setForm] = useState(initial);
  const packagings = useQuery({ queryKey: ["reference", "packaging"], queryFn: referenceDataApi.packagingTypes, staleTime: 5 * 60_000 });
  const drivers = useQuery({ queryKey: ["dispatch", "drivers"], queryFn: staffApi.drivers, enabled: can(P.dispatchAssignDriver), staleTime: 5 * 60_000 });
  const save = useUpdateCompany(company.id, "Delivery defaults saved");
  const lead = Number(form.deliveryLeadMinutes);
  const leadValid = Number.isInteger(lead) && lead >= 0;
  const dirty = JSON.stringify(form) !== JSON.stringify(initial);

  return (
    <Panel title="Delivery defaults" description="Used for new orders unless the employee may change them.">
      <fieldset disabled={!canManage} className="grid gap-4 sm:grid-cols-2">
        <Field id="dd-time" label="Default delivery time" hint="Business-local time.">
          <Input id="dd-time" type="time" step={300} className="num w-36" value={form.defaultDeliveryTime} onChange={(e) => setForm({ ...form, defaultDeliveryTime: e.target.value })} />
        </Field>
        <Field id="dd-lead" label="Minutes before delivery the order must leave the kitchen" error={leadValid ? null : "Use a whole number of minutes (0 or more)."}
          hint="Sets the planned dispatch-ready time: delivery time minus these minutes. Default 60.">
          <Input id="dd-lead" inputMode="numeric" className="num w-28" value={form.deliveryLeadMinutes} onChange={(e) => setForm({ ...form, deliveryLeadMinutes: e.target.value })} />
        </Field>
        <Field id="dd-pack" label="Default packaging">
          <Select value={form.defaultPackagingTypeId} onValueChange={(v) => setForm({ ...form, defaultPackagingTypeId: String(v ?? form.defaultPackagingTypeId) })}>
            <SelectTrigger id="dd-pack" className="w-full">
              <SelectValue>{(v: string) => packagings.data?.find((p) => p.id === v)?.name ?? company.defaultPackagingType.name}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {(packagings.data ?? []).filter((p) => p.isActive || p.id === form.defaultPackagingTypeId).map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field id="dd-driver" label="Default driver" hint="New drops for this company get this driver; dispatch can change it.">
          <Select value={form.defaultDriverStaffUserId ?? NO_DRIVER} onValueChange={(v) => setForm({ ...form, defaultDriverStaffUserId: !v || v === NO_DRIVER ? null : String(v) })}>
            <SelectTrigger id="dd-driver" className="w-full">
              <SelectValue>{(v: string) => (v === NO_DRIVER ? "No default driver" : (drivers.data?.find((d) => d.id === v)?.name ?? company.defaultDriver?.name ?? "Driver"))}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_DRIVER}>No default driver</SelectItem>
              {(drivers.data ?? []).map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field id="dd-instructions" label="Standing driver instructions" hint="Shown to the driver on every drop for this company." className="sm:col-span-2">
          <Textarea id="dd-instructions" value={form.driverInstructions} onChange={(e) => setForm({ ...form, driverInstructions: e.target.value })} />
        </Field>
      </fieldset>
      <FormErrorAlert messages={errorMessages(save.error)} />
      {canManage && (
        <Button
          className="mt-4 w-fit"
          disabled={!dirty || !leadValid || save.isPending}
          onClick={() => save.mutate({ ...form, deliveryLeadMinutes: lead, driverInstructions: form.driverInstructions.trim() || null })}
        >
          {save.isPending ? "Saving…" : "Save delivery defaults"}
        </Button>
      )}
    </Panel>
  );
}
