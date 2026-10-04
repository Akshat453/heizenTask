"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Field } from "@/components/app/field";
import { FormErrorAlert } from "@/components/app/form-error-alert";
import { FormSection, SectionIndex, StickySaveBar } from "@/components/app/form-layout";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useUnsavedChangesGuard } from "@/hooks/use-unsaved-changes";
import { companiesApi, pricingApi, referenceDataApi, type DayOfWeek } from "@/lib/api";
import { describeError, isApiError } from "@/lib/api-client";
import { P } from "@/lib/permissions";
import { AddressFields, addressReady, emptyAddress, toAddressInput } from "./address-fields";
import { WorkingDayChips } from "./calendar-tab";
import { companyKeys } from "./queries";

const SECTIONS = [
  { id: "company", label: "Company" },
  { id: "domains", label: "Domains" },
  { id: "address", label: "First address" },
  { id: "owner", label: "Owner" },
  { id: "delivery", label: "Delivery defaults" },
  { id: "pricing", label: "Pricing" },
];
type SectionId = (typeof SECTIONS)[number]["id"];
const DEFAULT_TIER = "__default";

/** Server messages → the section that owns the field (domain conflicts go to Domains). */
function sectionOf(message: string): SectionId | null {
  if (/^(name|billingContact)/.test(message)) return "company";
  if (/^domains|domain/i.test(message)) return "domains";
  if (/^addresses/.test(message) || /address/i.test(message)) return "address";
  if (/^owner/i.test(message)) return "owner";
  if (/^(defaultDeliveryTime|deliveryLeadMinutes|defaultPackagingTypeId|driverInstructions|defaultDriver|workingDays|holidays)/.test(message) || /packaging|driver/i.test(message)) return "delivery";
  if (/tier/i.test(message)) return "pricing";
  return null;
}

export function CompanyCreateForm() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { can } = useAuth();
  const [form, setForm] = useState({
    name: "", billingContactName: "", billingContactEmail: "", billingContactPhone: "",
    defaultDeliveryTime: "12:30", deliveryLeadMinutes: "60", defaultPackagingTypeId: "", driverInstructions: "",
    priceTierId: null as string | null,
  });
  const [domains, setDomains] = useState<string[]>([]);
  const [domainText, setDomainText] = useState("");
  const [address, setAddress] = useState(emptyAddress);
  const [owner, setOwner] = useState({ name: "", email: "", canChooseDeliveryAddress: false, canChangeDeliveryTime: false, canChangePackaging: false });
  const [days, setDays] = useState<DayOfWeek[]>(["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"]);
  const packagings = useQuery({ queryKey: ["reference", "packaging"], queryFn: referenceDataApi.packagingTypes, staleTime: 5 * 60_000 });
  const tiers = useQuery({ queryKey: ["pricing", "tiers"], queryFn: pricingApi.listTiers, enabled: can(P.pricingRead) });
  useUnsavedChangesGuard(Boolean(form.name || domains.length || owner.name));

  const create = useMutation({
    mutationFn: () =>
      companiesApi.create({
        name: form.name.trim(),
        billingContactName: form.billingContactName.trim(),
        billingContactEmail: form.billingContactEmail.trim(),
        billingContactPhone: form.billingContactPhone.trim() || null,
        domains,
        addresses: [toAddressInput(address, { isActive: true })],
        owner: { ...owner, name: owner.name.trim(), email: owner.email.trim() || null, allergenIds: [], dietaryTagIds: [] },
        priceTierId: form.priceTierId,
        defaultDeliveryTime: form.defaultDeliveryTime,
        deliveryLeadMinutes: Number(form.deliveryLeadMinutes),
        defaultPackagingTypeId: form.defaultPackagingTypeId,
        driverInstructions: form.driverInstructions.trim() || null,
        workingDays: days,
        holidays: [],
        hiddenCategoryIds: [],
        hiddenDishIds: [],
      }),
    onSuccess: (company) => {
      toast.success("Company created");
      void queryClient.invalidateQueries({ queryKey: companyKeys.all });
      router.push(`/companies/${company.id}`);
    },
  });
  const messages = create.error ? (isApiError(create.error) ? create.error.messages : [describeError(create.error)]) : [];
  const bySection = (id: SectionId) => messages.filter((m) => sectionOf(m) === id);
  const unplaced = messages.filter((m) => sectionOf(m) === null);
  const lead = Number(form.deliveryLeadMinutes);
  const ready =
    form.name.trim() && form.billingContactName.trim() && form.billingContactEmail.trim() && domains.length > 0 &&
    addressReady(address) && owner.name.trim() && form.defaultPackagingTypeId && days.length > 0 && Number.isInteger(lead) && lead >= 0;
  const errs = (id: SectionId) => (bySection(id).length ? <FormErrorAlert messages={bySection(id)} /> : null);
  const text = (key: keyof typeof form, label: string, opts: { type?: string; hint?: string } = {}) => (
    <Field id={`cc-${key}`} label={label} hint={opts.hint}>
      <Input id={`cc-${key}`} type={opts.type} value={(form[key] as string) ?? ""} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
    </Field>
  );

  return (
    <div className="flex gap-6">
      <SectionIndex sections={SECTIONS} />
      <form
        id="company-form"
        className="flex min-w-0 flex-1 flex-col gap-6"
        onSubmit={(e) => {
          e.preventDefault();
          if (ready) create.mutate();
        }}
      >
        <FormErrorAlert messages={unplaced} />
        <FormSection id="company" title="Company">
          <div className="grid gap-3 sm:grid-cols-2">
            {text("name", "Company name")}
            {text("billingContactName", "Billing contact name")}
            {text("billingContactEmail", "Billing contact email", { type: "email" })}
            {text("billingContactPhone", "Billing contact phone", { hint: "Optional" })}
          </div>
          {errs("company")}
        </FormSection>
        <FormSection id="domains" title="Email domains" description="At least one. Each domain belongs to one company; public domains like gmail.com are refused.">
          <ul className="flex flex-wrap gap-1.5">
            {domains.map((d) => (
              <li key={d} className="inline-flex h-7 items-center gap-1 rounded-full border bg-secondary pr-1 pl-3 text-sm">
                <span className="num">{d}</span>
                <button type="button" aria-label={`Remove ${d}`} onClick={() => setDomains(domains.filter((x) => x !== d))} className="grid size-5 place-items-center rounded-full hover:bg-accent"><X className="size-3" /></button>
              </li>
            ))}
          </ul>
          <div className="flex gap-2">
            <Input value={domainText} onChange={(e) => setDomainText(e.target.value)} placeholder="acme.example" aria-label="Domain" className="num max-w-64"
              onKeyDown={(e) => {
                if (e.key !== "Enter") return;
                e.preventDefault();
                const v = domainText.trim().toLowerCase();
                if (v && !domains.includes(v)) setDomains([...domains, v]);
                setDomainText("");
              }} />
            <Button type="button" variant="outline" disabled={!domainText.trim()} onClick={() => { const v = domainText.trim().toLowerCase(); if (v && !domains.includes(v)) setDomains([...domains, v]); setDomainText(""); }}>Add domain</Button>
          </div>
          {bySection("domains").map((m) => <p key={m} className="text-xs text-danger">{m}</p>)}
        </FormSection>
        <FormSection id="address" title="First delivery address" description="More addresses can be added later.">
          <AddressFields idPrefix="cc-addr" value={address} onChange={setAddress} />
          {errs("address")}
        </FormSection>
        <FormSection id="owner" title="Owner" description="Created as the company's first employee in the same save.">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field id="cc-owner-name" label="Name"><Input id="cc-owner-name" value={owner.name} onChange={(e) => setOwner({ ...owner, name: e.target.value })} /></Field>
            <Field id="cc-owner-email" label="Email" hint="Optional"><Input id="cc-owner-email" type="email" value={owner.email} onChange={(e) => setOwner({ ...owner, email: e.target.value })} /></Field>
          </div>
          {([["canChooseDeliveryAddress", "Can choose their own delivery address"], ["canChangeDeliveryTime", "Can change the delivery time"], ["canChangePackaging", "Can change packaging"]] as const).map(([key, label]) => (
            <label key={key} className="flex items-center gap-2 text-sm"><Switch checked={owner[key]} onCheckedChange={(on) => setOwner({ ...owner, [key]: on })} /> {label}</label>
          ))}
          {errs("owner")}
        </FormSection>
        <FormSection id="delivery" title="Delivery defaults">
          <div className="grid gap-3 sm:grid-cols-2">
            {text("defaultDeliveryTime", "Default delivery time", { type: "time" })}
            {text("deliveryLeadMinutes", "Minutes before delivery the order must leave the kitchen", { hint: "Sets the planned dispatch-ready time. Default 60." })}
            <Field id="cc-pack" label="Default packaging">
              <Select value={form.defaultPackagingTypeId} onValueChange={(v) => setForm({ ...form, defaultPackagingTypeId: String(v ?? "") })}>
                <SelectTrigger id="cc-pack" className="w-full"><SelectValue placeholder="Choose packaging">{(v: string) => packagings.data?.find((p) => p.id === v)?.name ?? "Choose packaging"}</SelectValue></SelectTrigger>
                <SelectContent>{(packagings.data ?? []).filter((p) => p.isActive).map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field id="cc-instructions" label="Standing driver instructions" hint="Optional" className="sm:col-span-2">
              <Textarea id="cc-instructions" value={form.driverInstructions} onChange={(e) => setForm({ ...form, driverInstructions: e.target.value })} />
            </Field>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Delivery days</span>
            <WorkingDayChips value={days} onChange={setDays} />
          </div>
          {errs("delivery")}
        </FormSection>
        <FormSection id="pricing" title="Pricing">
          <Field id="cc-tier" label="Price tier">
            <Select value={form.priceTierId ?? DEFAULT_TIER} onValueChange={(v) => setForm({ ...form, priceTierId: !v || v === DEFAULT_TIER ? null : String(v) })}>
              <SelectTrigger id="cc-tier" className="w-full max-w-sm"><SelectValue>{(v: string) => (v === DEFAULT_TIER ? "Use default tier" : (tiers.data?.find((t) => t.id === v)?.name ?? "Tier"))}</SelectValue></SelectTrigger>
              <SelectContent>
                <SelectItem value={DEFAULT_TIER}>Use default tier</SelectItem>
                {(tiers.data ?? []).filter((t) => t.isActive).map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          {errs("pricing")}
        </FormSection>
        <StickySaveBar
          visible
          message={ready ? "Ready to create" : "Fill in the required fields (name, contact, a domain, an address, the owner and packaging)"}
          saving={create.isPending}
          form="company-form"
          saveLabel="Create company"
          onDiscard={() => router.push("/companies")}
        />
      </form>
    </div>
  );
}
