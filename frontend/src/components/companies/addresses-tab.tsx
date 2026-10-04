"use client";

import { MapPin, Pencil, Plus } from "lucide-react";
import { useState } from "react";
import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { FormErrorAlert } from "@/components/app/form-error-alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { AddressInput, CompanyAddress, CompanyDetail } from "@/lib/api";
import { cn } from "@/lib/utils";
import { AddressFields, addressReady, emptyAddress, toAddressInput, type AddressDraft } from "./address-fields";
import { errorMessages, useUpdateCompany } from "./queries";

const asInput = (a: CompanyAddress): AddressInput => ({
  id: a.id, label: a.label, line1: a.line1, line2: a.line2, city: a.city, region: a.region, postalCode: a.postalCode, country: a.country, isActive: a.isActive,
});
const asDraft = (a: CompanyAddress): AddressDraft => ({
  label: a.label, line1: a.line1, line2: a.line2 ?? "", city: a.city, region: a.region ?? "", postalCode: a.postalCode ?? "", country: a.country,
});

/** Addresses are saved as the whole list (the API replaces it); deactivation never deletes. */
export function AddressesTab({ company, canManage }: { company: CompanyDetail; canManage: boolean }) {
  const [editing, setEditing] = useState<{ id?: string; draft: AddressDraft } | null>(null);
  const [toggling, setToggling] = useState<CompanyAddress | null>(null);
  const save = useUpdateCompany(company.id, "Addresses saved");
  const all = company.addresses.map(asInput);

  const submitEdit = () => {
    if (!editing) return;
    const next = editing.id
      ? all.map((a) => (a.id === editing.id ? toAddressInput(editing.draft, { id: a.id, isActive: a.isActive }) : a))
      : [...all, toAddressInput(editing.draft, { isActive: true })];
    save.mutate({ addresses: next }, { onSuccess: () => setEditing(null) });
  };
  const toggle = (address: CompanyAddress) =>
    save.mutate({ addresses: all.map((a) => (a.id === address.id ? { ...a, isActive: !address.isActive } : a)) }, { onSettled: () => setToggling(null) });

  return (
    <div className="flex flex-col gap-4">
      {canManage && (
        <Button className="w-fit" onClick={() => { save.reset(); setEditing({ draft: emptyAddress() }); }}>
          <Plus data-icon="inline-start" /> Add address
        </Button>
      )}
      {!editing && <FormErrorAlert messages={errorMessages(save.error)} />}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {company.addresses.map((a) => (
          <article key={a.id} className={cn("flex flex-col gap-2 rounded-lg border bg-card p-4", !a.isActive && "opacity-70")}>
            <div className="flex items-start justify-between gap-2">
              <p className="flex items-center gap-1.5 font-medium"><MapPin className="size-4 text-muted-foreground" aria-hidden /> {a.label}</p>
              {!a.isActive && <span className="rounded-md border bg-neutral-soft px-1.5 text-xs text-neutral">Inactive</span>}
            </div>
            <p className="text-sm text-muted-foreground">{[a.line1, a.line2, a.city, a.region, a.postalCode, a.country].filter(Boolean).join(", ")}</p>
            {canManage && (
              <div className="mt-auto flex gap-2 pt-1">
                <Button size="sm" variant="outline" onClick={() => { save.reset(); setEditing({ id: a.id, draft: asDraft(a) }); }}>
                  <Pencil data-icon="inline-start" /> Edit
                </Button>
                <Button size="sm" variant="ghost" onClick={() => (a.isActive ? setToggling(a) : toggle(a))} disabled={save.isPending}>
                  {a.isActive ? "Deactivate" : "Reactivate"}
                </Button>
              </div>
            )}
          </article>
        ))}
      </div>

      <Dialog open={Boolean(editing)} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="shadow-soft sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit address" : "New address"}</DialogTitle>
          </DialogHeader>
          {editing && <AddressFields idPrefix="addr" value={editing.draft} onChange={(draft) => setEditing({ ...editing, draft })} />}
          <FormErrorAlert messages={errorMessages(save.error)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button disabled={!editing || !addressReady(editing.draft) || save.isPending} onClick={submitEdit}>
              {save.isPending ? "Saving…" : "Save address"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={Boolean(toggling)}
        onOpenChange={(o) => !o && setToggling(null)}
        title={`Deactivate ${toggling?.label}?`}
        description="It can no longer be chosen for new orders. Existing orders keep their delivery address. The server refuses if employees use it as their default address."
        confirmLabel="Deactivate address"
        destructive
        pending={save.isPending}
        onConfirm={() => toggling && toggle(toggling)}
      />
    </div>
  );
}
