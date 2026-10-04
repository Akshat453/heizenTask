import { CircleCheck, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { EmptyState } from "@/components/app/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import type { StatusTone } from "@/lib/status";
import { cn } from "@/lib/utils";

export type AttentionItem = {
  id: string;
  /** danger = a promise is broken; warning = needs attention soon; info = waiting on someone. */
  tone: Extract<StatusTone, "danger" | "warning" | "info">;
  icon: LucideIcon;
  /** One sentence. */
  text: ReactNode;
  /** Sort key within a tone (epoch ms; earlier first). */
  at?: number;
  /** Button or link to where it is fixed. */
  action: ReactNode;
};

const TONE_ORDER = { danger: 0, warning: 1, info: 2 } as const;
const ICON_CLASS = { danger: "bg-danger-soft text-danger", warning: "bg-warning-soft text-warning", info: "bg-info-soft text-info" } as const;

/** Sorted by severity, then time. */
export function AttentionList({ items, loading, emptyText }: { items: AttentionItem[]; loading?: boolean; emptyText: string }) {
  if (loading) {
    return (
      <ul className="divide-y" aria-busy="true">
        {Array.from({ length: 3 }, (_, i) => (
          <li key={i} className="flex items-center gap-3 px-4 py-3">
            <Skeleton className="size-8 rounded-full" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-7 w-24" />
          </li>
        ))}
      </ul>
    );
  }
  if (items.length === 0) {
    return <EmptyState icon={CircleCheck} title="Nothing needs you right now" description={emptyText} />;
  }
  const sorted = [...items].sort((a, b) => TONE_ORDER[a.tone] - TONE_ORDER[b.tone] || (a.at ?? 0) - (b.at ?? 0));
  return (
    <ul className="divide-y">
      {sorted.map((item) => (
        <li key={item.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <span className={cn("grid size-8 shrink-0 place-items-center rounded-full", ICON_CLASS[item.tone])}>
              <item.icon aria-hidden className="size-4" />
            </span>
            <p className="min-w-0 text-sm">{item.text}</p>
          </div>
          <div className="shrink-0 pl-11 sm:pl-0">{item.action}</div>
        </li>
      ))}
    </ul>
  );
}
