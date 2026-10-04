import { Info } from "lucide-react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatCount } from "@/lib/format";
import { TONE_CLASS, type StatusTone } from "@/lib/status";
import { cn } from "@/lib/utils";

export type MetricRow = { label: string; value: number; definition: string; href?: string; tone?: StatusTone };

/** Compact label/value rows for rail panels; each value is a backend figure with its definition tooltip. */
export function MetricList({ rows, loading }: { rows: MetricRow[]; loading?: boolean }) {
  return (
    <dl className="divide-y">
      {rows.map((row) => (
        <div key={row.label} className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0">
          <dt className="flex items-center gap-1.5 text-sm">
            {row.href ? (
              <Link href={row.href} className="hover:underline">
                {row.label}
              </Link>
            ) : (
              row.label
            )}
            <Tooltip>
              <TooltipTrigger render={<button type="button" aria-label={`How "${row.label}" is calculated`} />} className="text-muted-foreground hover:text-foreground">
                <Info className="size-3.5" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs text-xs leading-relaxed">{row.definition}</TooltipContent>
            </Tooltip>
          </dt>
          <dd>
            {loading ? (
              <Skeleton className="h-5 w-8" />
            ) : (
              <span
                className={cn(
                  "num inline-flex min-w-8 justify-center rounded-md border px-1.5 text-sm font-semibold",
                  row.tone && row.value > 0 ? TONE_CLASS[row.tone] : "border-transparent",
                )}
              >
                {formatCount(row.value)}
              </span>
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}
