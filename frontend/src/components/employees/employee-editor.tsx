"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { EntityCombobox, type ComboboxItem } from "@/components/app/entity-combobox";
import { FormErrorAlert } from "@/components/app/form-error-alert";
import { Panel } from "@/components/app/panel";
import { StickySaveBar } from "@/components/app/form-layout";
import { useAuth } from "@/components/auth/auth-provider";
import { useUnsavedChangesGuard } from "@/hooks/use-unsaved-changes";
import { companiesApi, employeesApi, referenceDataApi, type Employee, type EmployeeWriteInput } from "@/lib/api";
import { CONFLICT_MESSAGE, describeError, isApiError } from "@/lib/api-client";
import { P } from "@/lib/permissions";
import { EmployeeFormFields, splitEmployeeErrors, type EmployeeDraft } from "./employee-form-fields";
import { employeeKeys } from "./queries";

const toDraft = (e: Employee): EmployeeDraft => ({
  name: e.name, email: e.email ?? "", defaultDeliveryAddressId: e.defaultDeliveryAddress?.id ?? null,
  canChooseDeliveryAddress: e.canChooseDeliveryAddress, canChangeDeliveryTime: e.canChangeDeliveryTime, canChangePackaging: e.canChangePackaging,
  allergenIds: e.allergens.map((a) => a.allergen.id), dietaryTagIds: e.dietaryTags.map((t) => t.dietaryTag.id),
});

export function EmployeeEditor({ employee }: { employee: Employee }) {
  const { can } = useAuth();
  const queryClient = useQueryClient();
  const canManage = can(P.employeesManage);
  const [initial] = useState(() => toDraft(employee));
  const [draft, setDraft] = useState(initial);
  const [moveTo, setMoveTo] = useState<ComboboxItem | null>(null);
  const company = useQuery({ queryKey: ["companies", "detail", employee.company.id], queryFn: () => companiesApi.get(employee.company.id), enabled: can(P.companiesRead) });
  const allergens = useQuery({ queryKey: ["reference", "allergens"], queryFn: referenceDataApi.allergens, staleTime: 5 * 60_000 });
  const tags = useQuery({ queryKey: ["reference", "dietary-tags"], queryFn: referenceDataApi.dietaryTags, staleTime: 5 * 60_000 });
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial);
  useUnsavedChangesGuard(dirty && canManage);

  const update = useMutation({
    mutationFn: (body: Partial<EmployeeWriteInput>) => employeesApi.update(employee.id, body),
    onSuccess: (_r, body) => {
      toast.success(body.companyId ? "Employee moved" : "Employee saved");
      setMoveTo(null);
      void queryClient.invalidateQueries({ queryKey: employeeKeys.all });
      void queryClient.invalidateQueries({ queryKey: ["companies"] });
    },
    onError: (error, body) => {
      if (body.companyId) setMoveTo(null);
      if (isApiError(error, 409) && /concurrent/i.test(error.message)) toast.error(CONFLICT_MESSAGE);
    },
  });
  const messages = update.error ? (isApiError(update.error) ? update.error.messages : [describeError(update.error)]) : [];
  const errors = splitEmployeeErrors(messages);

  return (
    <div className="flex flex-col gap-6">
      <Panel title="Company" description="Orders are always placed under the employee's current company.">
        <div className="flex flex-wrap items-center gap-3">
          <p className="font-medium">{employee.company.name}</p>
          {employee.ownedCompany && <span className="rounded-md border bg-secondary px-1.5 text-xs">Owner</span>}
          {canManage && (
            <div className="w-64">
              <EntityCombobox
                label="Move to company"
                placeholder="Move to another company…"
                queryKey="companies"
                value={null}
                onChange={(item) => item && item.id !== employee.company.id && setMoveTo(item)}
                search={async (term) => (await companiesApi.list({ search: term || undefined, pageSize: 10 })).data.filter((c) => c.id !== employee.company.id).map((c) => ({ id: c.id, label: c.name }))}
              />
            </div>
          )}
        </div>
      </Panel>
      <Panel title="Profile, ordering and preferences">
        <EmployeeFormFields
          idPrefix="emp"
          value={draft}
          onChange={setDraft}
          addresses={company.data?.addresses ?? []}
          allergens={allergens.data ?? []}
          dietaryTags={tags.data ?? []}
          errors={errors}
          disabled={!canManage}
        />
        <div className="mt-3"><FormErrorAlert messages={errors.form} /></div>
      </Panel>
      {canManage && (
        <StickySaveBar
          visible={dirty}
          message="Unsaved changes"
          saving={update.isPending}
          onDiscard={() => setDraft(initial)}
          onSave={() => update.mutate({ ...draft, name: draft.name.trim(), email: draft.email.trim() || null })}
        />
      )}
      <ConfirmDialog
        open={Boolean(moveTo)}
        onOpenChange={(o) => !o && setMoveTo(null)}
        title={`Move ${employee.name} to ${moveTo?.label}?`}
        description={`Future orders use the new company's menu, prices, addresses and calendar. Past orders stay with ${employee.company.name}. Their default address is cleared.`}
        confirmLabel="Move employee"
        pending={update.isPending}
        onConfirm={() => moveTo && update.mutate({ companyId: moveTo.id, defaultDeliveryAddressId: null })}
      />
    </div>
  );
}
