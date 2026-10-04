"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useBusinessClock } from "@/hooks/use-business-clock";
import { formatBusinessDate, timeZoneNames } from "@/lib/format";

/** "Sun 4 Oct · IST": the backend business date, with the full timezone in a tooltip. */
export function BusinessDayChip() {
  const { businessDate, timeZone, isLoading } = useBusinessClock();
  if (isLoading) return <Skeleton className="h-7 w-32" />;
  const names = timeZoneNames(timeZone);
  return (
    <Tooltip>
      <TooltipTrigger
        render={<button type="button" />}
        className="inline-flex h-7 items-center gap-2 rounded-md border bg-card px-2.5 text-xs font-medium focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <span aria-hidden className="size-2 rounded-full bg-saffron" />
        <span className="num">{businessDate ? formatBusinessDate(businessDate) : "Business day"}</span>
        <span className="text-muted-foreground">· {names.short}</span>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs text-xs">
        Business day {businessDate ? formatBusinessDate(businessDate, { withYear: true }) : "unavailable"}. All times are
        shown in {names.long} ({timeZone}).
      </TooltipContent>
    </Tooltip>
  );
}
