import { Fragment } from "react";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

/** cents null renders "—" (unknown until the server prices it). */
export type MoneyRow = { label: string; cents: number | null; muted?: boolean };

type MoneyBreakdownProps = {
  rows: MoneyRow[];
  total: { label: string; cents: number | null };
  /** Small note under the total, e.g. "Estimated: final price is set by the server". */
  note?: string;
  className?: string;
};

/** Label + amount rows, a divider and a bold total, all right-aligned in mono. Amounts come from the API. */
export function MoneyBreakdown({ rows, total, note, className }: MoneyBreakdownProps) {
  return (
    <dl className={cn("grid grid-cols-[1fr_auto] gap-x-6 gap-y-1.5 text-sm", className)}>
      {rows.map((row, index) => (
        <Fragment key={`${row.label}-${index}`}>
          <dt className={cn(row.muted && "text-muted-foreground")}>{row.label}</dt>
          <dd className={cn("num text-right", row.muted && "text-muted-foreground")}>{formatMoney(row.cents)}</dd>
        </Fragment>
      ))}
      <div className="col-span-2 my-1 border-t" role="presentation" />
      <dt className="font-semibold">{total.label}</dt>
      <dd className="num text-right font-semibold">{formatMoney(total.cents)}</dd>
      {note && <p className="col-span-2 text-right text-xs text-muted-foreground">{note}</p>}
    </dl>
  );
}
