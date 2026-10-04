import { Info } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type KpiTileProps = {
  label: string;
  /** Already-formatted backend figure (formatMoney / formatCount). null = no data. */
  value: ReactNode | null;
  /** Comparison or denominator, e.g. "18 of 22". */
  sub?: ReactNode;
  /** Exact calculation; wording must match the README dashboard definitions. */
  definition: string;
  /** Link to the filtered list behind the figure. */
  href?: string;
  /** Optional series from the API (never computed in the browser). */
  sparkline?: number[];
  loading?: boolean;
  /** Shown when value is null, e.g. "Settings not readable for this role". */
  noDataReason?: string;
  className?: string;
};

function Sparkline({ points }: { points: number[] }) {
  if (points.length < 2) return null;
  const max = Math.max(...points);
  const min = Math.min(...points);
  const span = max - min || 1;
  const path = points
    .map((p, i) => `${((i / (points.length - 1)) * 100).toFixed(1)},${(28 - ((p - min) / span) * 24).toFixed(1)}`)
    .join(" ");
  return (
    <svg viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden className="h-8 w-24 text-chart-1">
      <polyline points={path} fill="none" stroke="currentColor" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export function KpiTile({ label, value, sub, definition, href, sparkline, loading, noDataReason, className }: KpiTileProps) {
  const body = (
    <>
      <div className="flex items-center justify-between gap-2">
        <span className="label-caps text-muted-foreground">{label}</span>
        <Tooltip>
          <TooltipTrigger
            render={<button type="button" aria-label={`How "${label}" is calculated`} />}
            className="rounded-sm text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            onClick={(event) => event.preventDefault()}
          >
            <Info className="size-3.5" />
          </TooltipTrigger>
          <TooltipContent className="max-w-xs text-xs leading-relaxed">{definition}</TooltipContent>
        </Tooltip>
      </div>
      {loading ? (
        <div className="mt-3 flex flex-col gap-2" aria-busy="true">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-3 w-32" />
        </div>
      ) : value === null ? (
        <div className="mt-3">
          <p className="num text-[28px] leading-9 text-muted-foreground">—</p>
          <p className="text-xs text-muted-foreground">{noDataReason ?? "No data"}</p>
        </div>
      ) : (
        <div className="mt-2 flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="num text-[28px] leading-9 font-semibold tracking-tight">{value}</p>
            {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
          </div>
          {sparkline && <Sparkline points={sparkline} />}
        </div>
      )}
    </>
  );

  const shell = "block rounded-lg border bg-card p-4 text-card-foreground";
  return href && !loading ? (
    <Link href={href} className={cn(shell, "transition-colors hover:border-primary/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none", className)}>
      {body}
    </Link>
  ) : (
    <div className={cn(shell, className)}>{body}</div>
  );
}
