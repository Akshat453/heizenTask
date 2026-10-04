import {
  AlarmClock,
  BadgeCheck,
  Ban,
  ChefHat,
  Circle,
  CircleCheck,
  CircleX,
  Clock,
  FilePen,
  Loader,
  Lock,
  PackageCheck,
  Receipt,
  Send,
  TriangleAlert,
  Truck,
  type LucideIcon,
} from "lucide-react";

/** Semantic tones. Each maps to a `text-<tone>` / `bg-<tone>-soft` token pair. */
export type StatusTone = "neutral" | "info" | "progress" | "success" | "warning" | "danger";

export type StatusDef = { label: string; tone: StatusTone; icon: LucideIcon };

export const STATUS = {
  order: {
    DRAFT: { label: "Draft", tone: "neutral", icon: FilePen },
    PLACED: { label: "Placed", tone: "info", icon: Send },
    CONFIRMED: { label: "Confirmed", tone: "progress", icon: Lock },
    DELIVERED: { label: "Delivered", tone: "success", icon: CircleCheck },
    CANCELLED: { label: "Cancelled", tone: "neutral", icon: Ban },
    REJECTED: { label: "Rejected", tone: "danger", icon: CircleX },
  },
  prep: {
    NOT_STARTED: { label: "Not started", tone: "neutral", icon: Circle },
    STARTED: { label: "In progress", tone: "progress", icon: Loader },
    DONE: { label: "Done", tone: "success", icon: CircleCheck },
  },
  /** LATE labels are usually overridden with "Late by N min" via StatusBadge's `label` prop. */
  timing: {
    ON_TRACK: { label: "On track", tone: "success", icon: Clock },
    AT_RISK: { label: "At risk", tone: "warning", icon: TriangleAlert },
    LATE: { label: "Late", tone: "danger", icon: AlarmClock },
    COMPLETE: { label: "Done", tone: "success", icon: CircleCheck },
  },
  drop: {
    WAITING_ON_KITCHEN: { label: "Waiting on kitchen", tone: "neutral", icon: ChefHat },
    DISPATCH_READY: { label: "Ready to leave", tone: "progress", icon: PackageCheck },
    OUT_FOR_DELIVERY: { label: "Out for delivery", tone: "info", icon: Truck },
    DELIVERED: { label: "Delivered", tone: "success", icon: CircleCheck },
  },
  /** Display-only countdown against the API's plannedDispatchReadyAt. */
  dispatchTiming: {
    LEAVES_SOON: { label: "Leave by", tone: "info", icon: Clock },
    LEAVE_PASSED: { label: "Leave-by passed", tone: "warning", icon: TriangleAlert },
  },
  onTime: {
    ON_TIME: { label: "On time", tone: "success", icon: CircleCheck },
    LATE: { label: "Late", tone: "danger", icon: AlarmClock },
  },
  /** Where a tier price comes from. */
  priceSource: {
    OVERRIDE: { label: "Override", tone: "progress", icon: Lock },
    DERIVED: { label: "Derived", tone: "neutral", icon: Circle },
    MISSING: { label: "Missing", tone: "danger", icon: CircleX },
  },
  active: {
    ACTIVE: { label: "Active", tone: "success", icon: CircleCheck },
    INACTIVE: { label: "Inactive", tone: "neutral", icon: Ban },
  },
  /** Order cut-off state (instants come from the API). */
  cutoff: {
    OPEN: { label: "Open", tone: "info", icon: Clock },
    SOON: { label: "Locks soon", tone: "warning", icon: Clock },
    LOCKED: { label: "Locked", tone: "neutral", icon: Lock },
  },
  invoice: {
    UNPAID: { label: "Unpaid", tone: "warning", icon: Receipt },
    PAID: { label: "Paid", tone: "success", icon: BadgeCheck },
    NOT_INVOICED: { label: "Not invoiced", tone: "neutral", icon: Receipt },
    /** On an invoice (the order list does not say whether it is paid). */
    INVOICED: { label: "Invoiced", tone: "info", icon: Receipt },
  },
} as const satisfies Record<string, Record<string, StatusDef>>;

export type StatusKind = keyof typeof STATUS;
export type StatusValue<K extends StatusKind> = keyof (typeof STATUS)[K];

/** Tone -> soft badge classes (text + tint + border). The only place tone classes are spelled out. */
export const TONE_CLASS: Record<StatusTone, string> = {
  neutral: "bg-neutral-soft text-neutral border-neutral/20",
  info: "bg-info-soft text-info border-info/20",
  progress: "bg-progress-soft text-progress border-progress/20",
  success: "bg-success-soft text-success border-success/20",
  warning: "bg-warning-soft text-warning border-warning/20",
  danger: "bg-danger-soft text-danger border-danger/20",
};

export function getStatus<K extends StatusKind>(kind: K, value: StatusValue<K>): StatusDef {
  return (STATUS[kind] as Record<string, StatusDef>)[value as string];
}
