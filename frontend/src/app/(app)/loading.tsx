import { Skeleton } from "@/components/ui/skeleton";

/** Route-level skeleton: page header, toolbar and a table-shaped block. */
export default function AppLoading() {
  return (
    <main className="flex flex-col gap-6 p-4 md:p-6" aria-busy="true" aria-label="Loading page">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <Skeleton className="h-9 w-full max-w-md" />
      <div className="flex flex-col gap-2">
        {Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-11" />)}
      </div>
    </main>
  );
}
