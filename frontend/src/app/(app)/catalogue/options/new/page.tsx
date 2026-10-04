"use client";

import { AccessDenied } from "@/components/app/access-denied";
import { PageHeader } from "@/components/app/page-header";
import { useAuth } from "@/components/auth/auth-provider";
import { OptionEditor } from "@/components/catalogue/option-editor";
import { P } from "@/lib/permissions";

export default function NewOptionPage() {
  const { can } = useAuth();
  if (!can(P.catalogueManage)) return <AccessDenied className="py-24" />;
  return (
    <main className="flex flex-col gap-6 p-4 md:p-6">
      <PageHeader title="New option" description="Add it to a dish's option group after it is created." />
      <OptionEditor />
    </main>
  );
}
