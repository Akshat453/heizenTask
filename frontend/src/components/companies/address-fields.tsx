"use client";

import { Field } from "@/components/app/field";
import { Input } from "@/components/ui/input";
import type { AddressInput } from "@/lib/api";

export type AddressDraft = { label: string; line1: string; line2: string; city: string; region: string; postalCode: string; country: string };
export const emptyAddress = (): AddressDraft => ({ label: "", line1: "", line2: "", city: "", region: "", postalCode: "", country: "India" });

export const toAddressInput = (d: AddressDraft, extra: Partial<AddressInput> = {}): AddressInput => ({
  label: d.label.trim(), line1: d.line1.trim(), line2: d.line2.trim() || null, city: d.city.trim(),
  region: d.region.trim() || null, postalCode: d.postalCode.trim() || null, country: d.country.trim(), ...extra,
});

export const addressReady = (d: AddressDraft) => Boolean(d.label.trim() && d.line1.trim() && d.city.trim() && d.country.trim());

/** Label, street lines, city, region, postal code and country. */
export function AddressFields({ value, onChange, idPrefix }: { value: AddressDraft; onChange: (v: AddressDraft) => void; idPrefix: string }) {
  const field = (key: keyof AddressDraft, label: string, hint?: string, className?: string) => (
    <Field id={`${idPrefix}-${key}`} label={label} hint={hint} className={className}>
      <Input id={`${idPrefix}-${key}`} value={value[key]} onChange={(e) => onChange({ ...value, [key]: e.target.value })} />
    </Field>
  );
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {field("label", "Label", "e.g. Head office, Tower B", "sm:col-span-2")}
      {field("line1", "Address line 1", undefined, "sm:col-span-2")}
      {field("line2", "Address line 2", "Optional", "sm:col-span-2")}
      {field("city", "City")}
      {field("region", "State / region", "Optional")}
      {field("postalCode", "Postal code", "Optional")}
      {field("country", "Country")}
    </div>
  );
}
