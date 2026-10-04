"use client";

import { X } from "lucide-react";
import { useState } from "react";
import { EntityCombobox } from "@/components/app/entity-combobox";
import { Field } from "@/components/app/field";
import { FormErrorAlert } from "@/components/app/form-error-alert";
import { Panel } from "@/components/app/panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { employeesApi, type CompanyDetail } from "@/lib/api";
import { errorMessages, useUpdateCompany } from "./queries";

type Props = { company: CompanyDetail; canManage: boolean };

export function OverviewTab({ company, canManage }: Props) {
  const [contact, setContact] = useState({
    billingContactName: company.billingContactName,
    billingContactEmail: company.billingContactEmail,
    billingContactPhone: company.billingContactPhone ?? "",
  });
  const [domain, setDomain] = useState("");
  const saveContact = useUpdateCompany(company.id, "Billing contact saved");
  const saveOwner = useUpdateCompany(company.id, "Owner changed");
  const saveDomains = useUpdateCompany(company.id, "Domains updated");
  const domains = company.domains.map((d) => d.domain);
  const contactDirty =
    contact.billingContactName !== company.billingContactName ||
    contact.billingContactEmail !== company.billingContactEmail ||
    contact.billingContactPhone !== (company.billingContactPhone ?? "");
  const setDomains = (next: string[]) => saveDomains.mutate({ domains: next }, { onSuccess: () => setDomain("") });

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Panel title="Billing contact" description="Invoices are addressed to this person.">
        <fieldset disabled={!canManage} className="flex flex-col gap-3">
          <Field id="bc-name" label="Name">
            <Input id="bc-name" value={contact.billingContactName} onChange={(e) => setContact({ ...contact, billingContactName: e.target.value })} />
          </Field>
          <Field id="bc-email" label="Email">
            <Input id="bc-email" type="email" value={contact.billingContactEmail} onChange={(e) => setContact({ ...contact, billingContactEmail: e.target.value })} />
          </Field>
          <Field id="bc-phone" label="Phone" hint="Optional">
            <Input id="bc-phone" value={contact.billingContactPhone} onChange={(e) => setContact({ ...contact, billingContactPhone: e.target.value })} />
          </Field>
          <FormErrorAlert messages={errorMessages(saveContact.error)} />
          {canManage && (
            <Button
              className="w-fit"
              disabled={!contactDirty || saveContact.isPending}
              onClick={() => saveContact.mutate({ ...contact, billingContactPhone: contact.billingContactPhone.trim() || null })}
            >
              {saveContact.isPending ? "Saving…" : "Save billing contact"}
            </Button>
          )}
        </fieldset>
      </Panel>

      <div className="flex flex-col gap-6">
        <Panel title="Owner" description="The employee who owns the account. Must belong to this company.">
          {canManage ? (
            <EntityCombobox
              label="Owner"
              placeholder="Choose an employee"
              queryKey={`owner-${company.id}`}
              value={company.ownerEmployee ? { id: company.ownerEmployee.id, label: company.ownerEmployee.name } : null}
              disabled={saveOwner.isPending}
              onChange={(item) => item && item.id !== company.ownerEmployee?.id && saveOwner.mutate({ ownerEmployeeId: item.id })}
              search={async (term) =>
                (await employeesApi.list({ companyId: company.id, search: term || undefined, pageSize: 10 })).data.map((e) => ({ id: e.id, label: e.name, description: e.email ?? undefined }))
              }
            />
          ) : (
            <p className="text-sm">{company.ownerEmployee?.name ?? "No owner"}</p>
          )}
          <FormErrorAlert messages={errorMessages(saveOwner.error)} />
        </Panel>

        <Panel title="Email domains" description="Employees' email addresses use these domains. Each domain belongs to one company; public domains like gmail.com are refused.">
          <ul className="flex flex-wrap gap-1.5">
            {domains.map((d) => (
              <li key={d} className="inline-flex h-7 items-center gap-1 rounded-full border bg-secondary pr-1 pl-3 text-sm text-secondary-foreground">
                <span className="num">{d}</span>
                {canManage && domains.length > 1 && (
                  <button type="button" aria-label={`Remove ${d}`} disabled={saveDomains.isPending} onClick={() => setDomains(domains.filter((x) => x !== d))} className="grid size-5 place-items-center rounded-full hover:bg-accent">
                    <X className="size-3" />
                  </button>
                )}
              </li>
            ))}
          </ul>
          {canManage && (
            <form
              className="mt-3 flex flex-col gap-1"
              onSubmit={(e) => {
                e.preventDefault();
                const value = domain.trim().toLowerCase();
                if (value && !domains.includes(value)) setDomains([...domains, value]);
              }}
            >
              <div className="flex gap-2">
                <Input value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="acme.example" aria-label="Add a domain" aria-invalid={Boolean(saveDomains.error)} className="num max-w-64" />
                <Button type="submit" variant="outline" disabled={!domain.trim() || saveDomains.isPending}>Add domain</Button>
              </div>
              {errorMessages(saveDomains.error).map((m) => (
                <p key={m} className="text-xs text-danger">{m}</p>
              ))}
            </form>
          )}
        </Panel>
      </div>
    </div>
  );
}
