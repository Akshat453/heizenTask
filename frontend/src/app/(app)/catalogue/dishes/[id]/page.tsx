"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { ErrorState } from "@/components/app/error-state";
import { PageHeader } from "@/components/app/page-header";
import { StatusBadge } from "@/components/app/status-badge";
import { useAuth } from "@/components/auth/auth-provider";
import { DishEditor } from "@/components/catalogue/dish-editor";
import { catalogueKeys } from "@/components/catalogue/queries";
import { Skeleton } from "@/components/ui/skeleton";
import { catalogueApi } from "@/lib/api";
import { P } from "@/lib/permissions";

export default function DishPage() {
  const { id } = useParams<{ id: string }>();
  const { can } = useAuth();
  const dish = useQuery({ queryKey: catalogueKeys.dish(id), queryFn: () => catalogueApi.getDish(id) });
  if (dish.isLoading) return <Skeleton className="m-6 h-96" />;
  if (dish.error || !dish.data)
    return (
      <main className="p-4 md:p-6">
        <ErrorState error={dish.error} title="Could not load this dish" onRetry={() => void dish.refetch()} />
      </main>
    );
  return (
    <main className="flex flex-col gap-6 p-4 md:p-6">
      <PageHeader
        title={dish.data.name}
        description={
          <span className="flex items-center gap-2">
            <span className="num">{dish.data.sku}</span>
            <StatusBadge kind="active" value={dish.data.isActive ? "ACTIVE" : "INACTIVE"} size="sm" />
            {!can(P.catalogueManage) && <span>View only</span>}
          </span>
        }
      />
      {/* Remount with a fresh baseline whenever the server copy changes. */}
      <DishEditor key={dish.data.updatedAt ?? dish.dataUpdatedAt} dish={dish.data} />
    </main>
  );
}
