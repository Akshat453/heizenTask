"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Field } from "@/components/app/field";
import { FormErrorAlert } from "@/components/app/form-error-alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { staffApi, type StaffMember } from "@/lib/api";
import { CONFLICT_MESSAGE, describeError, isApiError } from "@/lib/api-client";
import { PasswordInput } from "./password-input";

export const staffKeys = { all: ["staff"] as const, roles: ["staff", "roles"] as const };

const PASSWORD_HINT = "8-72 characters with an upper-case letter, a lower-case letter, a digit and a symbol. Share it with the person securely.";

/** Add a staff member (member omitted) or edit an existing one's name and role. */
export function StaffDialog({ member, onOpenChange }: { member?: StaffMember; onOpenChange: (open: boolean) => void }) {
  const queryClient = useQueryClient();
  const roles = useQuery({ queryKey: staffKeys.roles, queryFn: staffApi.roles, staleTime: 5 * 60_000 });
  const [form, setForm] = useState({ name: member?.name ?? "", email: member?.email ?? "", roleId: member?.role.id ?? "", password: "" });
  const save = useMutation({
    mutationFn: () =>
      member
        ? staffApi.update(member.id, { name: form.name.trim(), roleId: form.roleId })
        : staffApi.create({ name: form.name.trim(), email: form.email.trim(), roleId: form.roleId, password: form.password }),
    onSuccess: (saved) => {
      toast.success(member ? `${saved.name} updated` : `${saved.name} added`);
      onOpenChange(false);
    },
    onSettled: () => void queryClient.invalidateQueries({ queryKey: staffKeys.all }),
  });
  const messages = save.error ? (isApiError(save.error) ? save.error.messages : [describeError(save.error)]) : [];
  const emailError = messages.find((m) => /email/i.test(m) && !/password/i.test(m));
  const passwordError = messages.find((m) => /^password/i.test(m));
  const formMessages = messages.filter((m) => m !== emailError && m !== passwordError);
  const ready = form.name.trim() && form.roleId && (member || (form.email.trim() && form.password));
  const roleName = (id: string) => roles.data?.find((r) => r.id === id)?.name ?? member?.role.name ?? "Choose a role";

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => { e.preventDefault(); if (ready) save.mutate(); }}
        >
          <DialogHeader>
            <DialogTitle>{member ? `Edit ${member.name}` : "Add staff member"}</DialogTitle>
            <DialogDescription>Staff sign in to Fernleaf. Their role decides what they can see and do.</DialogDescription>
          </DialogHeader>
          <Field id="staff-name" label="Name">
            <Input id="staff-name" maxLength={160} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          {member ? (
            <p className="text-sm"><span className="text-muted-foreground">Email</span> · {member.email}</p>
          ) : (
            <Field id="staff-email" label="Email" error={emailError}>
              <Input id="staff-email" type="email" autoComplete="off" maxLength={254} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </Field>
          )}
          <Field id="staff-role" label="Role">
            <Select value={form.roleId || null} onValueChange={(v) => setForm({ ...form, roleId: String(v ?? "") })}>
              <SelectTrigger id="staff-role" className="w-full">
                <SelectValue>{(v: string | null) => (v ? roleName(v) : "Choose a role")}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {(roles.data ?? []).map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    <span className="flex flex-col">
                      <span>{r.name}</span>
                      {r.description && <span className="text-xs text-muted-foreground">{r.description}</span>}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          {!member && (
            <Field id="staff-password" label="Initial password" hint={PASSWORD_HINT} error={passwordError}>
              <PasswordInput id="staff-password" value={form.password} onChange={(password) => setForm({ ...form, password })} />
            </Field>
          )}
          <FormErrorAlert messages={roles.error ? [describeError(roles.error), ...formMessages] : formMessages} />
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={!ready || save.isPending}>{save.isPending ? "Saving…" : member ? "Save changes" : "Add staff member"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** PATCH isActive; the server refuses deactivating yourself (409 with a reason). */
export function useSetStaffActive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ member, isActive }: { member: StaffMember; isActive: boolean }) => staffApi.update(member.id, { isActive }),
    onSuccess: (saved) => toast.success(saved.isActive ? `${saved.name} reactivated` : `${saved.name} deactivated`),
    onError: (error) => toast.error(isApiError(error, 409) && /concurrent/i.test(error.message) ? CONFLICT_MESSAGE : describeError(error)),
    onSettled: () => void queryClient.invalidateQueries({ queryKey: staffKeys.all }),
  });
}
