"use client";

import { AccessDenied } from "@/components/app/access-denied";
import { PageHeader } from "@/components/app/page-header";
import { useAuth } from "@/components/auth/auth-provider";
import { DishEditor } from "@/components/catalogue/dish-editor";
import { P } from "@/lib/permissions";

export default function NewDishPage() {
  const { can } = useAuth();
  if (!can(P.catalogueManage)) return <AccessDenied className="py-24" />;
  return (
    <main className="flex flex-col gap-6 p-4 md:p-6">
      <PageHeader title="New dish" description="Prices are set per tier after the dish is created." />
      <DishEditor />
    </main>
  );
}
