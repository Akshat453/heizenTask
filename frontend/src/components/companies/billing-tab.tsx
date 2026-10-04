"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { KpiGrid } from "@/components/app/kpi-grid";
import { KpiTile } from "@/components/app/kpi-tile";
import { Button } from "@/components/ui/button";
import { useInvoiceCount, useUninvoicedSummary } from "@/components/billing/queries";
import { type CompanyDetail } from "@/lib/api";
import { formatCount, formatMoney } from "@/lib/format";

/** Shortcut to company billing with server totals (no client-side money sums). */
export function BillingTab({ company }: { company: CompanyDetail }) {
  const uninvoiced = useUninvoicedSummary(company.id);
  const unpaid = useInvoiceCount({ companyId: company.id, status: "UNPAID" });
  return (
    <div className="flex flex-col gap-4">
      <KpiGrid>
        <KpiTile label="Not invoiced" loading={uninvoiced.isLoading} value={uninvoiced.data ? formatMoney(uninvoiced.data.totalUninvoicedCents) : null}
          sub={uninvoiced.data ? `${formatCount(uninvoiced.data.pagination.totalItems)} billable orders` : undefined}
          definition="Sum of billable amounts (frozen at confirmation) on this company's orders that are not on an invoice yet; includes orders cancelled after confirmation." />
        <KpiTile label="Unpaid invoices" loading={unpaid.isLoading} value={unpaid.data ? formatCount(unpaid.data.pagination.totalItems) : null}
          definition="Invoices for this company that are not marked paid. (The API does not return their combined value.)" href={`/billing?tab=invoices&company=${company.id}&status=UNPAID`} />
      </KpiGrid>
      <Button className="w-fit" render={<Link href={`/companies/${company.id}/billing`} />} nativeButton={false}>
        Open company billing <ArrowRight data-icon="inline-end" />
      </Button>
    </div>
  );
}
