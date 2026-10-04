"use client";

import { parseAsStringLiteral, useQueryState } from "nuqs";
import { AccessDenied } from "@/components/app/access-denied";
import { PageHeader } from "@/components/app/page-header";
import { TabNav } from "@/components/app/tab-nav";
import { useAuth } from "@/components/auth/auth-provider";
import { ByCompanyTable } from "@/components/billing/by-company-table";
import { InvoicesTable } from "@/components/billing/invoices-table";
import { P } from "@/lib/permissions";

const TABS = ["companies", "invoices"] as const;

export default function BillingPage() {
  const { can } = useAuth();
  const [tab, setTab] = useQueryState("tab", parseAsStringLiteral(TABS).withDefault("companies"));
  if (!can(P.billingRead)) return <AccessDenied className="py-24" />;
  return (
    <main className="flex flex-col gap-6 p-4 md:p-6">
      <PageHeader
        title="Billing"
        description="Billable orders not yet invoiced, and the invoices issued from them."
        tabs={
          <TabNav
            label="Billing views"
            tabs={[{ value: "companies", label: "By company" }, { value: "invoices", label: "Invoices" }]}
            value={tab}
            onChange={(v) => void setTab(v === "companies" ? null : v)}
          />
        }
      />
      {tab === "companies" ? <ByCompanyTable /> : <InvoicesTable />}
    </main>
  );
}
