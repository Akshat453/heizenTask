"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { employeesApi, companiesApi, referenceDataApi, type Employee, type Company, type NamedReference } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Edit2, Plus } from "lucide-react";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email").or(z.literal("")).optional(),
  companyId: z.string().min(1, "Company is required"),
  canChooseDeliveryAddress: z.boolean(),
  canChangeDeliveryTime: z.boolean(),
  canChangePackaging: z.boolean(),
  allergenIds: z.array(z.string()),
  dietaryTagIds: z.array(z.string()),
});

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [allergens, setAllergens] = useState<NamedReference[]>([]);
  const [dietaryTags, setDietaryTags] = useState<NamedReference[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isOpen, setIsOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Employee | null>(null);

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", email: "", companyId: "", canChooseDeliveryAddress: false, canChangeDeliveryTime: false, canChangePackaging: false, allergenIds: [], dietaryTagIds: [] },
  });

  const fetchData = async () => {
    try {
      const [empRes, compRes, a, d] = await Promise.all([
        employeesApi.list({ pageSize: 100 }),
        companiesApi.list({ pageSize: 100 }),
        referenceDataApi.allergens(),
        referenceDataApi.dietaryTags(),
      ]);
      setEmployees(empRes.data);
      setCompanies(compRes.data);
      setAllergens(a.filter(x => x.isActive));
      setDietaryTags(d.filter(x => x.isActive));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const openModal = (emp?: Employee) => {
    if (emp) {
      setEditingItem(emp);
      form.reset({
        name: emp.name,
        email: emp.email || "",
        companyId: emp.company.id,
        canChooseDeliveryAddress: emp.canChooseDeliveryAddress,
        canChangeDeliveryTime: emp.canChangeDeliveryTime,
        canChangePackaging: emp.canChangePackaging,
        allergenIds: emp.allergens.map(a => a.allergen.id),
        dietaryTagIds: emp.dietaryTags.map(d => d.dietaryTag.id),
      });
    } else {
      setEditingItem(null);
      form.reset({ name: "", email: "", companyId: "", canChooseDeliveryAddress: false, canChangeDeliveryTime: false, canChangePackaging: false, allergenIds: [], dietaryTagIds: [] });
    }
    setIsOpen(true);
  };

  const onSubmit = async (values: z.infer<typeof schema>) => {
    try {
      if (editingItem) {
        await employeesApi.update(editingItem.id, values);
        toast.success("Employee updated");
      } else {
        await employeesApi.create(values.companyId, values);
        toast.success("Employee created");
      }
      setIsOpen(false);
      fetchData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Action failed");
    }
  };

  if (loading) return <div className="p-8">Loading employees...</div>;

  return (
    <main className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">Employees</h1>
        
        <Button onClick={() => openModal()}><Plus className="h-4 w-4 mr-2" /> Add Employee</Button>

        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingItem ? "Edit" : "Create"} Employee</DialogTitle>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input {...form.register("name")} />
                  {form.formState.errors.name && <p className="text-sm text-red-500">{form.formState.errors.name.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Email (Optional)</Label>
                  <Input type="email" {...form.register("email")} />
                  {form.formState.errors.email && <p className="text-sm text-red-500">{form.formState.errors.email.message}</p>}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Company</Label>
                <Select value={form.watch("companyId") || ""} onValueChange={(val) => form.setValue("companyId", val || "")}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a company" />
                  </SelectTrigger>
                  <SelectContent>
                    {companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                {form.formState.errors.companyId && <p className="text-sm text-red-500">{form.formState.errors.companyId.message}</p>}
              </div>

              <div className="space-y-4 border rounded-lg p-4 bg-stone-50">
                <h3 className="font-medium text-sm">Permissions & Capabilities</h3>
                <div className="flex items-center space-x-2">
                  <Checkbox id="addr" checked={form.watch("canChooseDeliveryAddress")} onCheckedChange={(c) => form.setValue("canChooseDeliveryAddress", !!c)} />
                  <Label htmlFor="addr">Can choose delivery address</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="time" checked={form.watch("canChangeDeliveryTime")} onCheckedChange={(c) => form.setValue("canChangeDeliveryTime", !!c)} />
                  <Label htmlFor="time">Can change delivery time</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="pkg" checked={form.watch("canChangePackaging")} onCheckedChange={(c) => form.setValue("canChangePackaging", !!c)} />
                  <Label htmlFor="pkg">Can change packaging</Label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <Label>Allergens</Label>
                  {allergens.map(a => (
                    <div key={a.id} className="flex items-center space-x-2">
                      <Checkbox 
                        id={`all-${a.id}`} 
                        checked={form.watch("allergenIds").includes(a.id)}
                        onCheckedChange={(c) => {
                          const cur = form.watch("allergenIds");
                          form.setValue("allergenIds", c ? [...cur, a.id] : cur.filter(id => id !== a.id));
                        }}
                      />
                      <Label htmlFor={`all-${a.id}`} className="font-normal">{a.name}</Label>
                    </div>
                  ))}
                </div>
                
                <div className="space-y-3">
                  <Label>Dietary Tags</Label>
                  {dietaryTags.map(d => (
                    <div key={d.id} className="flex items-center space-x-2">
                      <Checkbox 
                        id={`diet-${d.id}`} 
                        checked={form.watch("dietaryTagIds").includes(d.id)}
                        onCheckedChange={(c) => {
                          const cur = form.watch("dietaryTagIds");
                          form.setValue("dietaryTagIds", c ? [...cur, d.id] : cur.filter(id => id !== d.id));
                        }}
                      />
                      <Label htmlFor={`diet-${d.id}`} className="font-normal">{d.name}</Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? "Saving..." : "Save"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      
      {employees.length === 0 ? (
        <p className="text-muted-foreground">No employees found.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-white">
          <table className="w-full text-sm text-left">
            <thead className="bg-stone-50 border-b">
              <tr>
                <th className="px-6 py-3 font-medium">Name</th>
                <th className="px-6 py-3 font-medium">Email</th>
                <th className="px-6 py-3 font-medium">Company</th>
                <th className="px-6 py-3 font-medium">Dietary Prefs</th>
                <th className="px-6 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {employees.map((e) => (
                <tr key={e.id} className="hover:bg-stone-50">
                  <td className="px-6 py-4 font-medium">{e.name}</td>
                  <td className="px-6 py-4">{e.email || "-"}</td>
                  <td className="px-6 py-4">{e.company.name}</td>
                  <td className="px-6 py-4 text-xs">
                    {e.dietaryTags.map(t => t.dietaryTag.name).concat(e.allergens.map(a => a.allergen.name)).join(", ") || "-"}
                  </td>
                  <td className="px-6 py-4 text-right">
                     <Button variant="ghost" size="icon" onClick={() => openModal(e)}>
                       <Edit2 className="h-4 w-4" />
                     </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
