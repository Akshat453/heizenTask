import { cn } from "@/lib/utils";
import { getStatus, TONE_CLASS, type StatusKind, type StatusValue } from "@/lib/status";

type StatusBadgeProps<K extends StatusKind> = {
  kind: K;
  value: StatusValue<K>;
  /** Overrides the label, e.g. "Late by 12 min". Icon and tone stay from the map. */
  label?: string;
  size?: "sm" | "md";
  className?: string;
};

/** Status is always icon + text + soft tint (src/lib/status.ts is the only source). */
export function StatusBadge<K extends StatusKind>({ kind, value, label, size = "md", className }: StatusBadgeProps<K>) {
  const status = getStatus(kind, value);
  const Icon = status.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border font-medium whitespace-nowrap",
        size === "sm" ? "h-5 px-1.5 text-xs" : "h-6 px-2 text-xs",
        TONE_CLASS[status.tone],
        className,
      )}
    >
      <Icon aria-hidden className={size === "sm" ? "size-3" : "size-3.5"} />
      {label ?? status.label}
    </span>
  );
}
