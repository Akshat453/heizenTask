"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { referenceDataApi, type NamedReference, type OrderedReference } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Edit2, Plus } from "lucide-react";

type RefType = "allergens" | "dietaryTags" | "kitchenStations" | "portionSizes" | "packagingTypes";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  displayOrder: z.number().optional(),
  isActive: z.boolean().optional(),
});

export default function ReferenceDataPage() {
  const [data, setData] = useState({
    allergens: [] as NamedReference[],
    dietaryTags: [] as NamedReference[],
    kitchenStations: [] as OrderedReference[],
    portionSizes: [] as OrderedReference[],
    packagingTypes: [] as OrderedReference[],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRefData = async () => {
    try {
      const [a, d, s, p, pkg] = await Promise.all([
        referenceDataApi.allergens(),
        referenceDataApi.dietaryTags(),
        referenceDataApi.kitchenStations(),
        referenceDataApi.portionSizes(),
        referenceDataApi.packagingTypes(),
      ]);
      setData({ allergens: a, dietaryTags: d, kitchenStations: s, portionSizes: p, packagingTypes: pkg });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load reference data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRefData();
  }, []);

  if (loading) return <div className="p-8">Loading reference data...</div>;
  if (error) return <div className="p-8 text-red-600">{error}</div>;

  return (
    <main className="p-8 max-w-7xl mx-auto space-y-8">
      <h1 className="text-2xl font-semibold">Reference Data</h1>
      
      <div className="grid lg:grid-cols-2 xl:grid-cols-3 gap-8">
        <RefSection title="Allergens" type="allergens" items={data.allergens} onSaved={fetchRefData} hasOrder={false} />
        <RefSection title="Dietary Tags" type="dietaryTags" items={data.dietaryTags} onSaved={fetchRefData} hasOrder={false} />
        <RefSection title="Kitchen Stations" type="kitchenStations" items={data.kitchenStations} onSaved={fetchRefData} hasOrder={true} />
        <RefSection title="Portion Sizes" type="portionSizes" items={data.portionSizes} onSaved={fetchRefData} hasOrder={true} />
        <RefSection title="Packaging Types" type="packagingTypes" items={data.packagingTypes} onSaved={fetchRefData} hasOrder={true} />
      </div>
    </main>
  );
}

function RefSection({ title, type, items, onSaved, hasOrder }: { title: string; type: RefType; items: (NamedReference | OrderedReference)[]; onSaved: () => void; hasOrder: boolean }) {
  const [isOpen, setIsOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<(NamedReference | OrderedReference) | null>(null);
  
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", displayOrder: 0, isActive: true },
  });

  const openModal = (item?: NamedReference | OrderedReference) => {
    if (item) {
      setEditingItem(item);
      form.reset({ name: item.name, isActive: item.isActive, displayOrder: 'displayOrder' in item ? item.displayOrder : 0 });
    } else {
      setEditingItem(null);
      form.reset({ name: "", displayOrder: 0, isActive: true });
    }
    setIsOpen(true);
  };

  const onSubmit = async (values: z.infer<typeof schema>) => {
    try {
      if (editingItem) {
        if (type === "allergens") await referenceDataApi.updateAllergen(editingItem.id, values);
        if (type === "dietaryTags") await referenceDataApi.updateDietaryTag(editingItem.id, values);
        if (type === "kitchenStations") await referenceDataApi.updateKitchenStation(editingItem.id, { name: values.name, isActive: values.isActive, displayOrder: values.displayOrder! });
        if (type === "portionSizes") await referenceDataApi.updatePortionSize(editingItem.id, { name: values.name, isActive: values.isActive, displayOrder: values.displayOrder! });
        if (type === "packagingTypes") await referenceDataApi.updatePackagingType(editingItem.id, { name: values.name, isActive: values.isActive, displayOrder: values.displayOrder! });
        toast.success(`${title} updated`);
      } else {
        if (type === "allergens") await referenceDataApi.createAllergen({ name: values.name });
        if (type === "dietaryTags") await referenceDataApi.createDietaryTag({ name: values.name });
        if (type === "kitchenStations") await referenceDataApi.createKitchenStation({ name: values.name, displayOrder: values.displayOrder || 0 });
        if (type === "portionSizes") await referenceDataApi.createPortionSize({ name: values.name, displayOrder: values.displayOrder || 0 });
        if (type === "packagingTypes") await referenceDataApi.createPackagingType({ name: values.name, displayOrder: values.displayOrder || 0 });
        toast.success(`${title} created`);
      }
      setIsOpen(false);
      onSaved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Action failed");
    }
  };

  return (
    <section className="p-6 rounded-lg border bg-white shadow-sm flex flex-col h-96">
      <div className="flex justify-between items-center border-b pb-4 mb-4">
        <h2 className="text-lg font-medium">{title}</h2>
        <Button variant="outline" size="sm" onClick={() => openModal()}><Plus className="h-4 w-4 mr-2" /> Add</Button>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingItem ? "Edit" : "Create"} {title}</DialogTitle>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input {...form.register("name")} />
                {form.formState.errors.name && <p className="text-sm text-red-500">{form.formState.errors.name.message}</p>}
              </div>
              
              {hasOrder && (
                <div className="space-y-2">
                  <Label>Display Order</Label>
                  <Input type="number" {...form.register("displayOrder", { valueAsNumber: true })} />
                </div>
              )}

              {editingItem && (
                <div className="flex items-center space-x-2 pt-2">
                  <Checkbox 
                    id={`${type}-active`} 
                    checked={form.watch("isActive")} 
                    onCheckedChange={(c) => form.setValue("isActive", !!c)} 
                  />
                  <Label htmlFor={`${type}-active`}>Is Active</Label>
                </div>
              )}

              <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? "Saving..." : "Save"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="overflow-y-auto flex-1 pr-2">
        <ul className="space-y-1">
          {items.map(item => (
            <li key={item.id} className={`text-sm py-2 border-b border-stone-100 last:border-0 flex justify-between items-center group ${!item.isActive ? 'opacity-50' : ''}`}>
              <div>
                <span className="font-medium">{item.name}</span>
                {hasOrder && 'displayOrder' in item && <span className="text-stone-400 text-xs ml-2">(Order: {item.displayOrder})</span>}
                {!item.isActive && <span className="text-red-500 text-xs ml-2">(Inactive)</span>}
              </div>
              <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => openModal(item)}>
                <Edit2 className="h-3 w-3" />
              </Button>
            </li>
          ))}
          {items.length === 0 && <li className="text-sm text-stone-500 italic py-2">No items found.</li>}
        </ul>
      </div>
    </section>
  );
}
