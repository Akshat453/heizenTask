/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps, react-hooks/incompatible-library */
"use client";

import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Trash2, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { companiesApi, referenceDataApi } from "@/lib/api";
import { useEffect, useState } from "react";

const ALL_DAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];

const schema = z.object({
  name: z.string().min(1, "Name required"),
  billingContactName: z.string().min(1, "Billing contact name required"),
  billingContactEmail: z.string().email("Invalid email"),
  billingContactPhone: z.string().optional(),
  defaultDeliveryTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Must be HH:mm"),
  deliveryLeadMinutes: z.number().min(0),
  defaultPackagingTypeId: z.string().min(1, "Required"),
  workingDays: z.array(z.string()).min(1, "At least one working day required"),
  domains: z.array(z.object({ domain: z.string().min(1) })).min(1, "At least one domain required"),
  addresses: z.array(z.object({
    id: z.string().optional(),
    label: z.string().min(1),
    line1: z.string().min(1),
    line2: z.string().optional(),
    city: z.string().min(1),
    region: z.string().optional(),
    postalCode: z.string().optional(),
    country: z.string().min(1),
    isActive: z.boolean().optional(),
  })).min(1, "At least one address required"),
  // Owner is required only on create (backend handles it)
  owner: z.object({
    name: z.string().min(1, "Owner name required"),
    email: z.string().email("Invalid email").or(z.literal("")).optional(),
    canChooseDeliveryAddress: z.boolean().default(false),
    canChangeDeliveryTime: z.boolean().default(false),
    canChangePackaging: z.boolean().default(false),
    allergenIds: z.array(z.string()).default([]),
    dietaryTagIds: z.array(z.string()).default([]),
  }).optional(),
});

type FormValues = z.infer<typeof schema>;

export function CompanyForm({ initialData }: { initialData?: any }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [pkgTypes, setPkgTypes] = useState<any[]>([]);

  useEffect(() => {
    referenceDataApi.packagingTypes().then(setPkgTypes).catch(console.error);
  }, []);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema) as any,
    defaultValues: initialData || {
      name: "", billingContactName: "", billingContactEmail: "", billingContactPhone: "",
      defaultDeliveryTime: "12:00", deliveryLeadMinutes: 60, defaultPackagingTypeId: "",
      workingDays: ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"],
      domains: [{ domain: "" }],
      addresses: [{ label: "HQ", line1: "", city: "", country: "", isActive: true }],
      owner: { name: "", email: "", canChooseDeliveryAddress: false, canChangeDeliveryTime: false, canChangePackaging: false, allergenIds: [], dietaryTagIds: [] }
    }
  });

  const { fields: domainFields, append: addDomain, remove: removeDomain } = useFieldArray({ control: form.control, name: "domains" });
  const { fields: addressFields, append: addAddress, remove: removeAddress } = useFieldArray({ control: form.control, name: "addresses" });

  const onSubmit = async (values: FormValues) => {
    setLoading(true);
    try {
      const payload = {
        ...values,
        domains: values.domains.map(d => d.domain),
        holidays: [],
        hiddenCategoryIds: [],
        hiddenDishIds: []
      };
      
      if (!initialData) {
        // Create requires owner
        if (!values.owner?.name) throw new Error("Owner name is required for new company");
        await companiesApi.create(payload);
        toast.success("Company created");
      } else {
        // Update doesn't need owner payload, it's patched separately if needed
        const { owner, ...updatePayload } = payload;
        await companiesApi.update(initialData.id, updatePayload);
        toast.success("Company updated");
      }
      router.push("/companies");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save company");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit as any)} className="space-y-8 max-w-4xl bg-white p-6 rounded-lg border">
      <section>
        <h2 className="text-lg font-medium border-b pb-2 mb-4">Basic Details</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2"><Label>Company Name</Label><Input {...form.register("name")} /></div>
          <div className="space-y-2"><Label>Billing Contact Name</Label><Input {...form.register("billingContactName")} /></div>
          <div className="space-y-2"><Label>Billing Contact Email</Label><Input type="email" {...form.register("billingContactEmail")} /></div>
          <div className="space-y-2"><Label>Billing Contact Phone</Label><Input {...form.register("billingContactPhone")} /></div>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-medium border-b pb-2 mb-4">Delivery Defaults</h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2"><Label>Default Delivery Time</Label><Input type="time" {...form.register("defaultDeliveryTime")} /></div>
          <div className="space-y-2"><Label>Lead Time (mins)</Label><Input type="number" {...form.register("deliveryLeadMinutes", { valueAsNumber: true })} /></div>
          <div className="space-y-2">
            <Label>Default Packaging</Label>
            <Select value={form.watch("defaultPackagingTypeId") || ""} onValueChange={(v) => form.setValue("defaultPackagingTypeId", v || "")}>
              <SelectTrigger><SelectValue placeholder="Select packaging" /></SelectTrigger>
              <SelectContent>{pkgTypes.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-medium border-b pb-2 mb-4">Domains</h2>
        {domainFields.map((field, i) => (
          <div key={field.id} className="flex gap-2 items-center mb-2">
            <Input placeholder="example.com" {...form.register(`domains.${i}.domain` as const)} />
            {domainFields.length > 1 && <Button type="button" variant="ghost" onClick={() => removeDomain(i)}><Trash2 className="h-4 w-4 text-red-500" /></Button>}
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={() => addDomain({ domain: "" })}><Plus className="h-4 w-4 mr-2" /> Add Domain</Button>
      </section>

      <section>
        <h2 className="text-lg font-medium border-b pb-2 mb-4">Addresses</h2>
        {addressFields.map((field, i) => (
          <div key={field.id} className="border p-4 rounded-md mb-4 bg-stone-50 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-medium text-sm">Address {i + 1}</h3>
              {addressFields.length > 1 && <Button type="button" variant="ghost" size="sm" onClick={() => removeAddress(i)}><Trash2 className="h-4 w-4 text-red-500" /></Button>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Label</Label><Input {...form.register(`addresses.${i}.label` as const)} /></div>
              <div className="space-y-2"><Label>Country</Label><Input {...form.register(`addresses.${i}.country` as const)} /></div>
              <div className="space-y-2 col-span-2"><Label>Line 1</Label><Input {...form.register(`addresses.${i}.line1` as const)} /></div>
              <div className="space-y-2 col-span-2"><Label>Line 2</Label><Input {...form.register(`addresses.${i}.line2` as const)} /></div>
              <div className="space-y-2"><Label>City</Label><Input {...form.register(`addresses.${i}.city` as const)} /></div>
              <div className="space-y-2"><Label>Postal Code</Label><Input {...form.register(`addresses.${i}.postalCode` as const)} /></div>
            </div>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={() => addAddress({ label: "", line1: "", city: "", country: "", isActive: true })}><Plus className="h-4 w-4 mr-2" /> Add Address</Button>
      </section>

      {!initialData && (
        <section>
          <h2 className="text-lg font-medium border-b pb-2 mb-4">Initial Owner</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Name</Label><Input {...form.register("owner.name")} /></div>
            <div className="space-y-2"><Label>Email</Label><Input type="email" {...form.register("owner.email")} /></div>
          </div>
        </section>
      )}

      <div className="flex justify-end pt-4 border-t">
        <Button type="button" variant="outline" className="mr-2" onClick={() => router.push("/companies")}>Cancel</Button>
        <Button type="submit" disabled={loading}>{loading ? "Saving..." : "Save Company"}</Button>
      </div>
    </form>
  );
}
