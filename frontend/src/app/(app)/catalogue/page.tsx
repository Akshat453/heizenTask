"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import { PageHeader } from "@/components/app/page-header";
import { TabNav } from "@/components/app/tab-nav";
import { useAuth } from "@/components/auth/auth-provider";
import { DishesTab } from "@/components/catalogue/dishes-tab";
import { OptionsTab } from "@/components/catalogue/options-tab";
import { Button } from "@/components/ui/button";
import { P } from "@/lib/permissions";

export default function CataloguePage() {
  const { can } = useAuth();
  const [tab, setTab] = useQueryState("tab", parseAsStringLiteral(["dishes", "options"] as const).withDefault("dishes"));
  const canManage = can(P.catalogueManage);
  const newButton = (href: string, label: string) =>
    canManage ? (
      <Button render={<Link href={href} />} nativeButton={false}>
        <Plus data-icon="inline-start" /> {label}
      </Button>
    ) : undefined;

  return (
    <main className="flex flex-col gap-6 p-4 md:p-6">
      <PageHeader
        title="Dishes & options"
        description={canManage ? "The catalogue every menu is built from. Dishes are deactivated, never deleted." : "The catalogue every menu is built from (view only)."}
        tabs={
          <TabNav
            label="Catalogue"
            tabs={[{ value: "dishes", label: "Dishes" }, { value: "options", label: "Options" }]}
            value={tab}
            onChange={(v) => void setTab(v === "dishes" ? null : v)}
          />
        }
      />
      {tab === "dishes" ? <DishesTab action={newButton("/catalogue/dishes/new", "New dish")} /> : <OptionsTab action={newButton("/catalogue/options/new", "New option")} />}
    </main>
  );
}
