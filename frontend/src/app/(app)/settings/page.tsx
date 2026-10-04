"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { settingsApi, type PlatformSettings } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

type SettingsData = {
  settings: PlatformSettings;
  workingDays: string[];
  holidays: { id: string; date: string; name: string | null }[];
};

const ALL_DAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];

const platformSchema = z.object({
  businessTimezone: z.string().min(1, "Timezone is required"),
  cutoffTime: z.string().min(1, "Cut-off time is required"),
  cutoffWorkingDayCount: z.number().min(0),
  kitchenReadyBufferMinutes: z.number().min(0),
  atRiskWindowMinutes: z.number().int().min(0).max(240),
});

const holidaySchema = z.object({
  date: z.string().min(1, "Date is required"),
  name: z.string().optional(),
});

export default function SettingsPage() {
  const [data, setData] = useState<SettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = async () => {
    try {
      const response = await settingsApi.get();
      setData(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchSettings();
  }, []);

  if (loading) return <div className="p-8">Loading settings...</div>;
  if (error || !data) return <div className="p-8 text-danger">{error || "No data"}</div>;

  return (
    <main className="p-8 max-w-7xl mx-auto">
      <h1 className="text-2xl font-semibold mb-6">Platform Settings</h1>
      <div className="space-y-8">
        <PlatformSettingsForm defaultValues={data.settings} onSaved={fetchSettings} />
        <WorkingDaysForm defaultDays={data.workingDays} onSaved={fetchSettings} />
        <HolidaysForm holidays={data.holidays} onSaved={fetchSettings} />
      </div>
    </main>
  );
}

function PlatformSettingsForm({ defaultValues, onSaved }: { defaultValues: PlatformSettings; onSaved: () => void }) {
  const [saving, setSaving] = useState(false);
  const form = useForm<z.infer<typeof platformSchema>>({
    resolver: zodResolver(platformSchema),
    defaultValues: {
      businessTimezone: defaultValues.businessTimezone,
      cutoffTime: new Date(defaultValues.cutoffTime).toISOString().slice(11, 16), // HH:mm
      cutoffWorkingDayCount: defaultValues.cutoffWorkingDayCount,
      kitchenReadyBufferMinutes: defaultValues.kitchenReadyBufferMinutes,
      atRiskWindowMinutes: defaultValues.atRiskWindowMinutes,
    },
  });

  const onSubmit = async (values: z.infer<typeof platformSchema>) => {
    setSaving(true);
    try {
      await settingsApi.update({
        businessTimezone: values.businessTimezone,
        cutoffTime: values.cutoffTime, // HH:mm, as the API expects
        cutoffWorkingDayCount: values.cutoffWorkingDayCount,
        kitchenReadyBufferMinutes: values.kitchenReadyBufferMinutes,
        atRiskWindowMinutes: values.atRiskWindowMinutes,
      });
      toast.success("Platform settings updated");
      onSaved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="p-6 rounded-lg border bg-card shadow-sm">
      <h2 className="text-lg font-medium border-b pb-4 mb-4">Time & Cut-offs</h2>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-2 gap-4 max-w-md">
        <div className="space-y-2">
          <Label>Business Timezone</Label>
          <Input {...form.register("businessTimezone")} />
          {form.formState.errors.businessTimezone && <p className="text-sm text-danger">{form.formState.errors.businessTimezone.message}</p>}
        </div>
        
        <div className="space-y-2">
          <Label>Cut-off Time (UTC)</Label>
          <Input type="time" {...form.register("cutoffTime")} />
          {form.formState.errors.cutoffTime && <p className="text-sm text-danger">{form.formState.errors.cutoffTime.message}</p>}
        </div>
        
        <div className="space-y-2">
          <Label>Working Days Before</Label>
          <Input type="number" {...form.register("cutoffWorkingDayCount", { valueAsNumber: true })} />
          {form.formState.errors.cutoffWorkingDayCount && <p className="text-sm text-danger">{form.formState.errors.cutoffWorkingDayCount.message}</p>}
        </div>
        
        <div className="space-y-2">
          <Label>Kitchen Ready Buffer (min)</Label>
          <Input type="number" {...form.register("kitchenReadyBufferMinutes", { valueAsNumber: true })} />
          {form.formState.errors.kitchenReadyBufferMinutes && <p className="text-sm text-danger">{form.formState.errors.kitchenReadyBufferMinutes.message}</p>}
        </div>

        <div className="space-y-2">
          <Label>At-Risk Window (min)</Label>
          <Input type="number" {...form.register("atRiskWindowMinutes", { valueAsNumber: true })} />
          {form.formState.errors.atRiskWindowMinutes && <p className="text-sm text-danger">{form.formState.errors.atRiskWindowMinutes.message}</p>}
        </div>

        <div className="col-span-2 pt-2">
          <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save Settings"}</Button>
        </div>
      </form>
    </section>
  );
}

function WorkingDaysForm({ defaultDays, onSaved }: { defaultDays: string[]; onSaved: () => void }) {
  const [saving, setSaving] = useState(false);
  const [days, setDays] = useState<string[]>(defaultDays);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await settingsApi.upsertWorkingDays(days);
      toast.success("Working days updated");
      onSaved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update working days");
    } finally {
      setSaving(false);
    }
  };

  const toggleDay = (day: string) => {
    setDays((prev) => prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]);
  };

  return (
    <section className="p-6 rounded-lg border bg-card shadow-sm">
      <h2 className="text-lg font-medium border-b pb-4 mb-4">Kitchen Working Days</h2>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="flex gap-4 flex-wrap">
          {ALL_DAYS.map(day => (
            <div key={day} className="flex items-center space-x-2">
              <Checkbox id={day} checked={days.includes(day)} onCheckedChange={() => toggleDay(day)} />
              <Label htmlFor={day} className="capitalize">{day.toLowerCase()}</Label>
            </div>
          ))}
        </div>
        <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save Working Days"}</Button>
      </form>
    </section>
  );
}

function HolidaysForm({ holidays, onSaved }: { holidays: { id: string; date: string; name: string | null }[]; onSaved: () => void }) {
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  const form = useForm<z.infer<typeof holidaySchema>>({
    resolver: zodResolver(holidaySchema),
    defaultValues: { date: "", name: "" },
  });

  const onSubmit = async (values: z.infer<typeof holidaySchema>) => {
    setSaving(true);
    try {
      await settingsApi.createHoliday({ date: values.date, name: values.name || undefined });
      toast.success("Holiday added");
      form.reset();
      onSaved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add holiday");
    } finally {
      setSaving(false);
    }
  };

  const deleteHoliday = async (id: string) => {
    setDeletingId(id);
    try {
      await settingsApi.deleteHoliday(id);
      toast.success("Holiday removed");
      onSaved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to remove holiday");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <section className="p-6 rounded-lg border bg-card shadow-sm">
      <h2 className="text-lg font-medium border-b pb-4 mb-4">Kitchen Holidays</h2>
      
      <div className="mb-6">
        {holidays.length === 0 ? (
          <p className="text-sm text-muted-foreground">No holidays scheduled.</p>
        ) : (
          <ul className="space-y-2 max-w-md">
            {holidays.map(h => (
              <li key={h.id} className="text-sm bg-background px-3 py-2 rounded flex justify-between items-center group">
                <div>
                  <span className="font-medium mr-4">{new Date(h.date).toISOString().split('T')[0]}</span>
                  <span className="text-muted-foreground">{h.name || "Untitled"}</span>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 text-muted-foreground hover:text-danger opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => deleteHoliday(h.id)}
                  disabled={deletingId === h.id}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="flex gap-4 items-end max-w-md p-4 bg-background rounded-lg border border-border">
        <div className="space-y-2 flex-1">
          <Label>Date</Label>
          <Input type="date" {...form.register("date")} />
        </div>
        <div className="space-y-2 flex-1">
          <Label>Name (Optional)</Label>
          <Input placeholder="e.g. Christmas" {...form.register("name")} />
        </div>
        <Button type="submit" disabled={saving}>{saving ? "Adding..." : "Add Holiday"}</Button>
      </form>
    </section>
  );
}
