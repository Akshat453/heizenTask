"use client";

import { AccessDenied } from "@/components/app/access-denied";
import { PageHeader } from "@/components/app/page-header";
import { useAuth } from "@/components/auth/auth-provider";
import { CompanyCreateForm } from "@/components/companies/company-create-form";
import { P } from "@/lib/permissions";

export default function NewCompanyPage() {
  const { can } = useAuth();
  if (!can(P.companiesManage)) return <AccessDenied className="py-24" />;
  return (
    <main className="flex flex-col gap-6 p-4 md:p-6">
      <PageHeader title="New company" description="Holidays, menu hiding and more addresses can be set on the company page afterwards." />
      <CompanyCreateForm />
    </main>
  );
}
