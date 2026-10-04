"use client";

import { useQuery } from "@tanstack/react-query";
import { KeyRound, UserSearch } from "lucide-react";
import { parseAsString, useQueryStates } from "nuqs";
import { useState } from "react";
import { EmptyState } from "@/components/app/empty-state";
import { EntityCombobox } from "@/components/app/entity-combobox";
import { ErrorState } from "@/components/app/error-state";
import { PageHeader } from "@/components/app/page-header";
import { Panel } from "@/components/app/panel";
import { useAuth } from "@/components/auth/auth-provider";
import { PreviewPhone } from "@/components/menu/preview-phone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { companiesApi, employeesApi, pricingApi } from "@/lib/api";
import { P } from "@/lib/permissions";

export default function MenuPreviewPage() {
  const { can } = useAuth();
  const [params, setParams] = useQueryStates({ employee: parseAsString, slug: parseAsString }, { history: "replace" });
  const [slugText, setSlugText] = useState(params.slug ?? "");
  const employee = useQuery({ queryKey: ["employees", "detail", params.employee], queryFn: () => employeesApi.get(params.employee!), enabled: Boolean(params.employee) });
  const company = useQuery({
    queryKey: ["companies", "detail", employee.data?.company.id],
    queryFn: () => companiesApi.get(employee.data!.company.id),
    enabled: Boolean(employee.data) && can(P.companiesRead),
  });
  const tiers = useQuery({ queryKey: ["pricing", "tiers"], queryFn: pricingApi.listTiers, enabled: can(P.pricingRead) });
  const menu = useQuery({
    queryKey: ["employees", "menu-preview", params.employee, params.slug],
    queryFn: () => (params.slug ? employeesApi.menuPreviewCategory(params.employee!, params.slug) : employeesApi.menuPreview(params.employee!)),
    enabled: Boolean(params.employee),
  });
  const tierName = menu.data ? (tiers.data?.find((t) => t.id === menu.data.tierId)?.name ?? "their tier") : null;

  return (
    <main className="flex flex-col gap-6 p-4 md:p-6">
      <PageHeader title="Menu preview" description="See the menu exactly as one employee sees it: company hiding, secret categories, activity and their tier's prices." />
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-full max-w-sm">
          <EntityCombobox
            label="Employee"
            placeholder="Search by name or email"
            queryKey="employees"
            value={params.employee ? { id: params.employee, label: employee.data?.name ?? "Employee" } : null}
            onChange={(item) => void setParams({ employee: item?.id ?? null, slug: null })}
            search={async (term) =>
              (await employeesApi.list({ search: term || undefined, pageSize: 10 })).data.map((e) => ({ id: e.id, label: e.name, description: e.company.name }))
            }
          />
        </div>
        {params.employee && (
          <form
            className="flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void setParams({ slug: slugText.trim() || null });
            }}
          >
            <Input value={slugText} onChange={(e) => setSlugText(e.target.value)} placeholder="secret-category-slug" aria-label="Category slug" className="num w-56" />
            <Button type="submit" variant="outline">
              <KeyRound data-icon="inline-start" /> Open secret category
            </Button>
            {params.slug && (
              <Button type="button" variant="ghost" onClick={() => { setSlugText(""); void setParams({ slug: null }); }}>
                Back to full menu
              </Button>
            )}
          </form>
        )}
      </div>
      {employee.data && (
        <p className="text-sm text-muted-foreground">
          {employee.data.company.name} · {tierName ?? "…"}
        </p>
      )}

      {!params.employee ? (
        <EmptyState icon={UserSearch} title="Choose an employee" description="The preview uses their company's hiding and price tier." />
      ) : menu.isLoading ? (
        <Skeleton className="mx-auto h-[36rem] w-full max-w-[420px] rounded-[2rem]" />
      ) : menu.error ? (
        <ErrorState error={menu.error} title={params.slug ? "That category is not available to this employee" : "Could not load the preview"} onRetry={() => void menu.refetch()} />
      ) : menu.data ? (
        <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
          <PreviewPhone menu={menu.data} />
          <Panel title="Rules applied">
            <ul className="flex flex-col gap-2 text-sm">
              <li>
                <span className="text-muted-foreground">Price tier:</span> {tierName}
              </li>
              {company.data && (
                <>
                  <li>
                    <span className="text-muted-foreground">Categories hidden for {company.data.name}:</span> <span className="num">{company.data.hiddenCategories.length}</span>
                  </li>
                  <li>
                    <span className="text-muted-foreground">Dishes hidden for {company.data.name}:</span> <span className="num">{company.data.hiddenDishes.length}</span>
                  </li>
                </>
              )}
              <li className="text-muted-foreground">
                {params.slug ? "Opened by link: a secret category still respects activity, hiding and pricing." : "Secret categories are left out of the normal menu."}
              </li>
              <li className="text-muted-foreground">Dishes without a price on this tier, and inactive categories, items, dishes or options, are left out. Allergy warnings never block ordering.</li>
              <li className="text-muted-foreground">Menus are not date-scheduled, so the delivery date does not change this view.</li>
            </ul>
          </Panel>
        </div>
      ) : null}
    </main>
  );
}
