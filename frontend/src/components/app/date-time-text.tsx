"use client";

import { useBusinessClock } from "@/hooks/use-business-clock";
import {
  formatBusinessDate,
  formatBusinessDateTime,
  formatBusinessTime,
  formatRelative,
} from "@/lib/format";
import { cn } from "@/lib/utils";

type DateTimeTextProps =
  | { value: string; mode: "date"; withYear?: boolean; className?: string }
  | { value: string | Date; mode: "time" | "datetime" | "relative"; className?: string };

/**
 * Renders a date/instant in the business timezone (never the browser's), inside
 * a <time> element whose tooltip shows the full timestamp and timezone.
 * mode "date" expects a calendar date (YYYY-MM-DD or a DATE column).
 */
export function DateTimeText(props: DateTimeTextProps) {
  const { timeZone, nowMs } = useBusinessClock();
  const { value, className } = props;
  const iso = typeof value === "string" ? value : value.toISOString();

  let text: string;
  if (props.mode === "date") text = formatBusinessDate(props.value, { withYear: props.withYear });
  else if (props.mode === "time") text = formatBusinessTime(value, timeZone);
  else if (props.mode === "datetime") text = formatBusinessDateTime(value, timeZone);
  else text = formatRelative(value, nowMs);

  const title = props.mode === "date" ? iso.slice(0, 10) : `${formatBusinessDateTime(value, timeZone)} (${timeZone})`;
  return (
    <time dateTime={iso} title={title} className={cn("num", className)}>
      {text}
    </time>
  );
}
