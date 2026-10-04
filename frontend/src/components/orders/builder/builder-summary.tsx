"use client";

import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBusinessClock } from "@/hooks/use-business-clock";
import type { CutoffInfo, MenuPreviewDish } from "@/lib/api";
import { formatBusinessDate, formatDuration, formatMoney } from "@/lib/format";
import { estimateLineCents, type LineDraft } from "./model";

type Props = {
  employeeName: string | null;
  companyName: string | null;
  date: string | null;
  cutoff: CutoffInfo | undefined;
  lines: LineDraft[];
  dishes: Map<string, MenuPreviewDish>;
  lineErrors: Record<string, string[]>;
  onEdit: (line: LineDraft) => void;
  onRemove: (line: LineDraft) => void;
};

/** Sticky summary: who, when, lines and an integer-cent "Estimated total". */
export function BuilderSummary({ employeeName, companyName, date, cutoff, lines, dishes, lineErrors, onEdit, onRemove }: Props) {
  const { nowMs } = useBusinessClock();
  const estimates = lines.map((line) => estimateLineCents(dishes.get(line.dishId), line));
  const total = estimates.every((e) => e !== null) ? estimates.reduce<number>((sum, e) => sum + (e ?? 0), 0) : null;
  const remaining = cutoff ? new Date(cutoff.cutoffInstant).getTime() - nowMs : null;

  return (
    <div className="flex flex-col gap-4">
      <dl className="grid grid-cols-[5.5rem_1fr] gap-x-2 gap-y-1 text-sm">
        <dt className="text-muted-foreground">Employee</dt>
        <dd>{employeeName ?? "—"}</dd>
        <dt className="text-muted-foreground">Company</dt>
        <dd>{companyName ?? "—"}</dd>
        <dt className="text-muted-foreground">Delivery</dt>
        <dd className="num">{date ? formatBusinessDate(date, { withYear: true }) : "—"}</dd>
        {remaining !== null && (
          <>
            <dt className="text-muted-foreground">Cut-off</dt>
            <dd className={remaining < 24 * 3_600_000 ? "text-warning" : undefined}>
              {remaining > 0 ? `locks in ${formatDuration(remaining)}` : "passed"}
            </dd>
          </>
        )}
      </dl>

      <div className="border-t pt-3">
        {lines.length === 0 ? (
          <p className="text-sm text-muted-foreground">No dishes yet. Add them in step 2.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {lines.map((line, i) => (
              <li key={line.key} className="text-sm">
                <div className="flex items-start gap-2">
                  <p className="min-w-0 flex-1">
                    <span className="num text-muted-foreground">{line.quantity}×</span> {line.dishName}
                    <span className="block text-xs text-muted-foreground">
                      {line.combinations.length} combination{line.combinations.length === 1 ? "" : "s"}
                    </span>
                  </p>
                  <span className="num">{estimates[i] === null ? "—" : formatMoney(estimates[i])}</span>
                  <Button variant="ghost" size="icon-xs" aria-label={`Edit ${line.dishName}`} onClick={() => onEdit(line)}>
                    <Pencil />
                  </Button>
                  <Button variant="ghost" size="icon-xs" aria-label={`Remove ${line.dishName}`} onClick={() => onRemove(line)}>
                    <Trash2 />
                  </Button>
                </div>
                {lineErrors[line.key]?.map((message) => (
                  <p key={message} className="mt-1 text-xs text-danger">
                    {message}
                  </p>
                ))}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex items-baseline justify-between border-t pt-3">
        <span className="font-semibold">Estimated total</span>
        <span className="num text-lg font-semibold">{formatMoney(total)}</span>
      </div>
      <p className="text-xs text-muted-foreground">Final prices are calculated by the server when you save.</p>
    </div>
  );
}
