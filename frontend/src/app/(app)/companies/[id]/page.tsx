"use client";

import { Building2, Layers } from "lucide-react";
import { useParams } from "next/navigation";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import { ErrorState } from "@/components/app/error-state";
import { PageHeader } from "@/components/app/page-header";
import { TabNav } from "@/components/app/tab-nav";
import { useAuth } from "@/components/auth/auth-provider";
import { AddressesTab } from "@/components/companies/addresses-tab";
import { BillingTab } from "@/components/companies/billing-tab";
import { CalendarTab } from "@/components/companies/calendar-tab";
import { DeliveryTab } from "@/components/companies/delivery-tab";
import { EmployeesTab } from "@/components/companies/employees-tab";
import { MenuPricingTab } from "@/components/companies/menu-pricing-tab";
import { OverviewTab } from "@/components/companies/overview-tab";
import { useCompany } from "@/components/companies/queries";
import { Skeleton } from "@/components/ui/skeleton";
import { P } from "@/lib/permissions";

const TABS = ["overview", "addresses", "calendar", "delivery", "menu", "employees", "billing"] as const;
type Tab = (typeof TABS)[number];

export default function CompanyPage() {
  const { id } = useParams<{ id: string }>();
  const { can } = useAuth();
  const company = useCompany(id);
  const [tab, setTab] = useQueryState("tab", parseAsStringLiteral(TABS).withDefault("overview"));
  const canManage = can(P.companiesManage);
  const tabs: { value: Tab; label: string }[] = [
    { value: "overview", label: "Overview" },
    { value: "addresses", label: "Addresses" },
    { value: "calendar", label: "Calendar" },
    { value: "delivery", label: "Delivery defaults" },
    { value: "menu", label: "Menu and pricing" },
    ...(can(P.employeesRead) ? [{ value: "employees" as const, label: "Employees" }] : []),
    ...(can(P.billingRead) ? [{ value: "billing" as const, label: "Billing" }] : []),
  ];
  const current = tabs.some((t) => t.value === tab) ? tab : "overview";

  if (company.isLoading) return <Skeleton className="m-6 h-96" />;
  if (company.error || !company.data)
    return (
      <main className="p-4 md:p-6">
        <ErrorState error={company.error} title="Could not load this company" onRetry={() => void company.refetch()} />
      </main>
    );
  const c = company.data;
  return (
    <main className="flex flex-col gap-6 p-4 md:p-6">
      <PageHeader
        title={c.name}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-md border bg-secondary px-1.5 text-xs text-secondary-foreground">
              <Layers className="size-3" aria-hidden /> {c.priceTier?.name ?? "Default tier"}
            </span>
            <span className="inline-flex items-center gap-1"><Building2 className="size-3.5" aria-hidden /> Owner: {c.ownerEmployee?.name ?? "none"}</span>
            {!canManage && <span>· View only</span>}
          </span>
        }
        tabs={<TabNav label="Company sections" tabs={tabs} value={current} onChange={(v) => void setTab(v === "overview" ? null : v)} />}
      />
      {current === "overview" && <OverviewTab key={c.updatedAt} company={c} canManage={canManage} />}
      {current === "addresses" && <AddressesTab company={c} canManage={canManage} />}
      {current === "calendar" && <CalendarTab key={c.updatedAt} company={c} canManage={canManage} />}
      {current === "delivery" && <DeliveryTab key={c.updatedAt} company={c} canManage={canManage} />}
      {current === "menu" && <MenuPricingTab key={c.updatedAt} company={c} canManage={canManage} />}
      {current === "employees" && <EmployeesTab company={c} canManage={can(P.employeesManage)} />}
      {current === "billing" && <BillingTab company={c} />}
    </main>
  );
}
