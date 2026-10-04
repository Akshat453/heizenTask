"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { EntityCombobox, type ComboboxItem } from "@/components/app/entity-combobox";
import { FormErrorAlert } from "@/components/app/form-error-alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { companiesApi, employeesApi, referenceDataApi } from "@/lib/api";
import { describeError, isApiError } from "@/lib/api-client";
import { EmployeeFormFields, emptyEmployee, splitEmployeeErrors } from "./employee-form-fields";
import { employeeKeys } from "./queries";

type Props = { open: boolean; onOpenChange: (open: boolean) => void; company?: ComboboxItem };

/** New employee for a fixed company, or one picked in the dialog. */
export function EmployeeCreateDialog({ open, onOpenChange, company: fixed }: Props) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [company, setCompany] = useState<ComboboxItem | null>(fixed ?? null);
  const [draft, setDraft] = useState(emptyEmployee);
  const detail = useQuery({ queryKey: ["companies", "detail", company?.id], queryFn: () => companiesApi.get(company!.id), enabled: Boolean(company) && open });
  const allergens = useQuery({ queryKey: ["reference", "allergens"], queryFn: referenceDataApi.allergens, enabled: open, staleTime: 5 * 60_000 });
  const tags = useQuery({ queryKey: ["reference", "dietary-tags"], queryFn: referenceDataApi.dietaryTags, enabled: open, staleTime: 5 * 60_000 });
  const create = useMutation({
    mutationFn: () =>
      employeesApi.create(company!.id, { ...draft, name: draft.name.trim(), email: draft.email.trim() || null }),
    onSuccess: (employee) => {
      toast.success("Employee added");
      void queryClient.invalidateQueries({ queryKey: employeeKeys.all });
      onOpenChange(false);
      setDraft(emptyEmployee());
      router.push(`/employees/${employee.id}`);
    },
  });
  const messages = create.error ? (isApiError(create.error) ? create.error.messages : [describeError(create.error)]) : [];
  const errors = splitEmployeeErrors(messages);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto shadow-soft sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Add employee</DialogTitle>
          <DialogDescription>Employees are the people orders are placed for. They belong to exactly one company.</DialogDescription>
        </DialogHeader>
        {!fixed && (
          <div className="flex flex-col gap-1.5">
            <Label>Company</Label>
            <EntityCombobox
              label="Company"
              placeholder="Choose a company"
              queryKey="companies"
              value={company}
              onChange={setCompany}
              search={async (term) => (await companiesApi.list({ search: term || undefined, pageSize: 10 })).data.map((c) => ({ id: c.id, label: c.name }))}
            />
          </div>
        )}
        {company && (
          <EmployeeFormFields
            idPrefix="new-emp"
            value={draft}
            onChange={setDraft}
            addresses={detail.data?.addresses ?? []}
            allergens={allergens.data ?? []}
            dietaryTags={tags.data ?? []}
            errors={errors}
          />
        )}
        <FormErrorAlert messages={errors.form} />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button disabled={!company || !draft.name.trim() || create.isPending} onClick={() => create.mutate()}>
            {create.isPending ? "Adding…" : "Add employee"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
