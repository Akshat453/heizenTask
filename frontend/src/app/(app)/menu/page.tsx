"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, ListTree, Plus } from "lucide-react";
import Link from "next/link";
import { parseAsString, useQueryState } from "nuqs";
import { useState } from "react";
import { toast } from "sonner";
import { EmptyState } from "@/components/app/empty-state";
import { ErrorState } from "@/components/app/error-state";
import { PageHeader } from "@/components/app/page-header";
import { move } from "@/components/app/reorder-buttons";
import { useAuth } from "@/components/auth/auth-provider";
import { CategoryList } from "@/components/menu/category-list";
import { CategoryPanel } from "@/components/menu/category-panel";
import { NewCategoryDialog } from "@/components/menu/new-category-dialog";
import { menuKeys, useCategories, useHidingIndex } from "@/components/menu/queries";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { menuApi, type MenuCategory, type MenuCategorySummary } from "@/lib/api";
import { CONFLICT_MESSAGE, describeError, isApiError } from "@/lib/api-client";
import { P } from "@/lib/permissions";

/** Remounts the panel only when the server copy really changes (not on every refetch). */
const categorySignature = (c: MenuCategory) =>
  JSON.stringify([c.id, c.name, c.slug, c.isSecret, c.items.map((i) => [i.dishId, i.displayOrder, i.isActive])]);

export default function MenuPage() {
  const { can } = useAuth();
  const queryClient = useQueryClient();
  const categories = useCategories();
  const hiding = useHidingIndex();
  const [selected, setSelected] = useQueryState("category", parseAsString);
  const [creating, setCreating] = useState(false);
  const canManage = can(P.catalogueManage);
  const canHide = can(P.companiesManage) && Boolean(hiding.data);
  const sorted = [...(categories.data ?? [])].sort((a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name));
  const currentId = (sorted.find((c) => c.id === selected) ?? sorted[0])?.id;
  // List rows only carry counts; the selected category's items come from its detail.
  const detail = useQuery({ queryKey: [...menuKeys.categories(), currentId], queryFn: () => menuApi.getCategory(currentId!), enabled: Boolean(currentId) });

  const refresh = () => void queryClient.invalidateQueries({ queryKey: menuKeys.categories() });
  const fail = (error: Error) => toast.error(isApiError(error, 409) ? CONFLICT_MESSAGE : describeError(error));
  const reorder = useMutation({
    mutationFn: async (next: MenuCategorySummary[]) => {
      for (const [i, c] of next.entries()) if (c.displayOrder !== i) await menuApi.updateCategory(c.id, { displayOrder: i });
    },
    onSuccess: () => toast.success("Category order saved"),
    onError: fail,
    onSettled: refresh,
  });
  const toggle = useMutation({
    mutationFn: ({ category, isActive }: { category: MenuCategorySummary; isActive: boolean }) => menuApi.updateCategory(category.id, { isActive }),
    onSuccess: (_r, v) => toast.success(v.isActive ? "Category shown on menus" : "Category hidden from menus"),
    onError: fail,
    onSettled: refresh,
  });

  return (
    <main className="flex flex-col gap-6 p-4 md:p-6">
      <PageHeader
        title="Menu"
        description="Categories and their dishes, in the order employees see them. Hiding is per company."
        actions={
          <>
            {can(P.employeesRead) && (
              <Button variant="outline" render={<Link href="/menu/preview" />} nativeButton={false}>
                <Eye data-icon="inline-start" /> Preview as employee
              </Button>
            )}
            {canManage && (
              <Button onClick={() => setCreating(true)}>
                <Plus data-icon="inline-start" /> New category
              </Button>
            )}
          </>
        }
      />
      {categories.isLoading ? (
        <div className="grid gap-6 lg:grid-cols-[22rem_1fr]">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      ) : categories.error ? (
        <ErrorState error={categories.error} title="Could not load the menu" onRetry={() => void categories.refetch()} />
      ) : sorted.length === 0 ? (
        <EmptyState icon={ListTree} title="No menu categories yet" description="Create a category, then add dishes to it." action={canManage ? <Button onClick={() => setCreating(true)}>New category</Button> : undefined} />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[22rem_1fr]">
          <CategoryList
            categories={sorted}
            selectedId={currentId ?? null}
            hiding={hiding.data}
            canManage={canManage}
            pending={reorder.isPending || toggle.isPending}
            onSelect={(id) => void setSelected(id)}
            onMove={(from, to) => reorder.mutate(move(sorted, from, to))}
            onToggleActive={(category, isActive) => toggle.mutate({ category, isActive })}
          />
          {detail.isLoading ? (
            <Skeleton className="h-96" />
          ) : detail.error ? (
            <ErrorState error={detail.error} title="Could not load this category" onRetry={() => void detail.refetch()} />
          ) : detail.data ? (
            <CategoryPanel key={categorySignature(detail.data)} category={detail.data} hiding={hiding.data} canManage={canManage} canHide={canHide} />
          ) : null}
        </div>
      )}
      <NewCategoryDialog open={creating} onOpenChange={setCreating} nextOrder={sorted.length} onCreated={(c) => void setSelected(c.id)} />
    </main>
  );
}
