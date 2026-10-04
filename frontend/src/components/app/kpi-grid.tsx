import type { ReactNode } from "react";

/** KPI row: auto-fill columns of at least 200px. */
export function KpiGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4">{children}</div>;
}
