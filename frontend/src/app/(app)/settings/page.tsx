"use client";

import { AccessDenied } from "@/components/app/access-denied";
import { ErrorState } from "@/components/app/error-state";
import { SectionIndex } from "@/components/app/form-layout";
import { PageHeader } from "@/components/app/page-header";
import { useAuth } from "@/components/auth/auth-provider";
import { CutoffSection } from "@/components/settings/cutoff-section";
import { KitchenCalendarSection } from "@/components/settings/kitchen-calendar-section";
import { useSettings } from "@/components/settings/queries";
import { TimingSection } from "@/components/settings/timing-section";
import { TimezoneSection } from "@/components/settings/timezone-section";
import { Skeleton } from "@/components/ui/skeleton";
import { P } from "@/lib/permissions";

const SECTIONS = [
  { id: "calendar", label: "Kitchen calendar" },
  { id: "cutoff", label: "Cut-off" },
  { id: "timing", label: "Kitchen timing" },
  { id: "timezone", label: "Business timezone" },
];

export default function SettingsPage() {
  const { can } = useAuth();
  const settings = useSettings();
  if (!can(P.settingsRead)) return <AccessDenied className="py-24" />;
  const canManage = can(P.settingsManage);
  const data = settings.data;
  // Remount sections after a save so their drafts start from the server values.
  const version = data ? JSON.stringify(data.settings) + data.workingDays.join() : "";

  return (
    <main className="flex flex-col gap-6 p-4 md:p-6">
      <PageHeader title="Settings" description={canManage ? "Each section saves on its own." : "Read-only: you can view these settings but not change them."} />
      {settings.isLoading ? (
        <div className="flex flex-col gap-4">{SECTIONS.map((s) => <Skeleton key={s.id} className="h-48" />)}</div>
      ) : settings.error || !data ? (
        <ErrorState error={settings.error} title="Could not load settings" onRetry={() => void settings.refetch()} />
      ) : (
        <div className="flex gap-8">
          <SectionIndex sections={SECTIONS} />
          <div key={version} className="flex min-w-0 max-w-3xl flex-1 flex-col gap-6">
            <KitchenCalendarSection workingDays={data.workingDays} holidays={data.holidays} canManage={canManage} />
            <CutoffSection settings={data.settings} canManage={canManage} />
            <TimingSection settings={data.settings} canManage={canManage} />
            <TimezoneSection settings={data.settings} canManage={canManage} />
          </div>
        </div>
      )}
    </main>
  );
}
