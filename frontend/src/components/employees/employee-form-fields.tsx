"use client";

import { ChipMultiSelect } from "@/components/app/chip-multi-select";
import { Field } from "@/components/app/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type { CompanyAddress, NamedReference } from "@/lib/api";

export type EmployeeDraft = {
  name: string; email: string; defaultDeliveryAddressId: string | null;
  canChooseDeliveryAddress: boolean; canChangeDeliveryTime: boolean; canChangePackaging: boolean;
  allergenIds: string[]; dietaryTagIds: string[];
};
export const emptyEmployee = (): EmployeeDraft => ({
  name: "", email: "", defaultDeliveryAddressId: null, canChooseDeliveryAddress: false, canChangeDeliveryTime: false, canChangePackaging: false, allergenIds: [], dietaryTagIds: [],
});

export const PERMISSION_FLAGS = [
  { key: "canChooseDeliveryAddress", label: "Can choose their own delivery address", help: "Otherwise orders always go to their default address." },
  { key: "canChangeDeliveryTime", label: "Can change the delivery time", help: "Otherwise orders use the company's default delivery time." },
  { key: "canChangePackaging", label: "Can change packaging", help: "Otherwise orders use the company's default packaging." },
] as const;

const NONE = "__none";

type Props = {
  value: EmployeeDraft;
  onChange: (value: EmployeeDraft) => void;
  addresses: CompanyAddress[];
  allergens: NamedReference[];
  dietaryTags: NamedReference[];
  errors?: { name?: string; email?: string };
  idPrefix: string;
  disabled?: boolean;
};

/** Profile, default address, ordering permissions and preferences. */
export function EmployeeFormFields({ value, onChange, addresses, allergens, dietaryTags, errors = {}, idPrefix, disabled }: Props) {
  const active = addresses.filter((a) => a.isActive || a.id === value.defaultDeliveryAddressId);
  return (
    <fieldset disabled={disabled} className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field id={`${idPrefix}-name`} label="Name" error={errors.name}>
          <Input id={`${idPrefix}-name`} value={value.name} onChange={(e) => onChange({ ...value, name: e.target.value })} />
        </Field>
        <Field id={`${idPrefix}-email`} label="Email" hint="Optional" error={errors.email}>
          <Input id={`${idPrefix}-email`} type="email" value={value.email} onChange={(e) => onChange({ ...value, email: e.target.value })} />
        </Field>
        <Field id={`${idPrefix}-address`} label="Default delivery address" className="sm:col-span-2">
          <Select value={value.defaultDeliveryAddressId ?? NONE} onValueChange={(v) => onChange({ ...value, defaultDeliveryAddressId: !v || v === NONE ? null : String(v) })}>
            <SelectTrigger id={`${idPrefix}-address`} className="w-full">
              <SelectValue>{(v: string) => (v === NONE ? "None (company default)" : (active.find((a) => a.id === v)?.label ?? "Address"))}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>None (company default)</SelectItem>
              {active.map((a) => <SelectItem key={a.id} value={a.id}>{a.label} <span className="text-xs text-muted-foreground">{a.city}</span></SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
      </div>
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium">Ordering permissions</p>
        {PERMISSION_FLAGS.map((flag) => (
          <label key={flag.key} className="flex items-start gap-3 rounded-md border p-2.5">
            <Switch checked={value[flag.key]} onCheckedChange={(on) => onChange({ ...value, [flag.key]: on })} className="mt-0.5" />
            <span>
              <span className="block text-sm font-medium">{flag.label}</span>
              <span className="block text-xs text-muted-foreground">{flag.help}</span>
            </span>
          </label>
        ))}
      </div>
      <ChipMultiSelect label="Allergies" tone="warning" options={allergens} value={value.allergenIds} onChange={(allergenIds) => onChange({ ...value, allergenIds })} disabled={disabled} />
      <ChipMultiSelect label="Dietary preferences" options={dietaryTags} value={value.dietaryTagIds} onChange={(dietaryTagIds) => onChange({ ...value, dietaryTagIds })} disabled={disabled} />
    </fieldset>
  );
}

/** Server messages that start with a field name go to that field; the rest to the form. */
export function splitEmployeeErrors(messages: string[]) {
  return {
    name: messages.find((m) => m.startsWith("name ")),
    email: messages.find((m) => m.startsWith("email ")),
    form: messages.filter((m) => !m.startsWith("name ") && !m.startsWith("email ")),
  };
}
