"use client";

import { cn } from "@/lib/utils";

type Props<T extends string> = { label: string; tabs: { value: T; label: string }[]; value: T; onChange: (value: T) => void };

/** Underlined tab strip (state usually lives in the URL via nuqs). */
export function TabNav<T extends string>({ label, tabs, value, onChange }: Props<T>) {
  return (
    <nav aria-label={label} className="flex gap-1 overflow-x-auto border-b">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          type="button"
          aria-current={tab.value === value ? "page" : undefined}
          onClick={() => onChange(tab.value)}
          className={cn(
            "-mb-px border-b-2 px-3 py-2 text-sm whitespace-nowrap",
            tab.value === value ? "border-primary font-medium text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
