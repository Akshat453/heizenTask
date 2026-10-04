import type { ReactNode } from "react";

/** Page frame shared by the four dashboards: header, KPI row, then a 12-column grid. */
export function DashboardPage({ children }: { children: ReactNode }) {
  return <main className="mx-auto flex w-full max-w-[1400px] flex-col gap-6 p-4 md:p-6">{children}</main>;
}

/** 8-column main area + 4-column rail on large screens; one column on mobile. */
export function DashboardGrid({ main, rail }: { main: ReactNode; rail: ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      <div className="flex min-w-0 flex-col gap-6 lg:col-span-8">{main}</div>
      <div className="flex min-w-0 flex-col gap-6 lg:col-span-4">{rail}</div>
    </div>
  );
}
