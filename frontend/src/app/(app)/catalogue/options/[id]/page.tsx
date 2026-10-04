"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { ErrorState } from "@/components/app/error-state";
import { PageHeader } from "@/components/app/page-header";
import { OptionEditor } from "@/components/catalogue/option-editor";
import { catalogueKeys } from "@/components/catalogue/queries";
import { Skeleton } from "@/components/ui/skeleton";
import { catalogueApi } from "@/lib/api";

export default function OptionPage() {
  const { id } = useParams<{ id: string }>();
  const option = useQuery({ queryKey: catalogueKeys.option(id), queryFn: () => catalogueApi.getOption(id) });
  if (option.isLoading) return <Skeleton className="m-6 h-96" />;
  if (option.error || !option.data)
    return (
      <main className="p-4 md:p-6">
        <ErrorState error={option.error} title="Could not load this option" onRetry={() => void option.refetch()} />
      </main>
    );
  return (
    <main className="flex flex-col gap-6 p-4 md:p-6">
      <PageHeader title={option.data.name} description="Options are shared across dishes; a change applies everywhere it is used." />
      <OptionEditor key={option.data.updatedAt ?? option.dataUpdatedAt} option={option.data} />
    </main>
  );
}
