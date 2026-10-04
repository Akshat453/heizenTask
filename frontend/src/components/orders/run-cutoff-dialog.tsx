"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, CircleCheck, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { addDays } from "@/components/app/date-range-filter";
import { FormErrorAlert } from "@/components/app/form-error-alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useBusinessClock } from "@/hooks/use-business-clock";
import { businessTimeApi, ordersApi, type CutoffSummary } from "@/lib/api";
import { describeError } from "@/lib/api-client";
import { businessDateOf, formatBusinessDate, formatBusinessTime, formatCount } from "@/lib/format";
import { invalidateOrders } from "./queries";

const PAST_DAYS = 7;
const FUTURE_DAYS = 9;

type Props = { open: boolean; onOpenChange: (open: boolean) => void };

/** Manual cut-off for one delivery date whose cut-off has passed (orders.override). */
export function RunCutoffDialog({ open, onOpenChange }: Props) {
  const queryClient = useQueryClient();
  const { businessDate: today, timeZone } = useBusinessClock();
  const [date, setDate] = useState<string | null>(null);
  const [result, setResult] = useState<{ date: string; summary: CutoffSummary } | null>(null);

  const window = useQuery({
    queryKey: ["cutoff-dialog-window", today],
    enabled: open && Boolean(today),
    queryFn: () =>
      Promise.all(
        Array.from({ length: PAST_DAYS + FUTURE_DAYS + 1 }, (_, i) => businessTimeApi.cutoff(addDays(today!, i - PAST_DAYS))),
      ),
  });
  const passed = (window.data ?? []).filter((info) => info.passed).reverse();

  const run = useMutation({
    mutationFn: (deliveryDate: string) => ordersApi.processCutoff(deliveryDate),
    onSuccess: (summary, deliveryDate) => {
      setResult({ date: deliveryDate, summary });
      toast.success(`Cut-off processed for ${formatBusinessDate(deliveryDate)}`);
      invalidateOrders(queryClient);
    },
  });

  const close = (next: boolean) => {
    if (!next) {
      setResult(null);
      run.reset();
    }
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="shadow-soft sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Run cut-off</DialogTitle>
          <DialogDescription>
            Drafts for this date are cancelled and placed orders are confirmed. Running it again is safe.
          </DialogDescription>
        </DialogHeader>

        {result ? (
          <CutoffResult date={result.date} summary={result.summary} />
        ) : window.isLoading || !today ? (
          <Skeleton className="h-9 w-full" />
        ) : (
          <div className="flex flex-col gap-2">
            <Label htmlFor="cutoff-date">Delivery date</Label>
            <Select value={date ?? ""} onValueChange={(value) => setDate(value ? String(value) : null)}>
              <SelectTrigger id="cutoff-date" className="w-full">
                <SelectValue placeholder="Choose a date whose cut-off has passed">
                  {(value: string) => (value ? formatBusinessDate(value, { withYear: true }) : "Choose a date")}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {passed.map((info) => (
                  <SelectItem key={info.deliveryDate} value={info.deliveryDate}>
                    <span className="num">{formatBusinessDate(info.deliveryDate)}</span>
                    <span className="text-xs text-muted-foreground">
                      locked {formatBusinessDate(businessDateOf(info.cutoffInstant, timeZone))}, {formatBusinessTime(info.cutoffInstant, timeZone)}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Only dates whose cut-off has passed can be processed.</p>
            {run.error && <FormErrorAlert messages={[describeError(run.error)]} />}
          </div>
        )}

        <DialogFooter>
          {result ? (
            <Button onClick={() => close(false)}>Done</Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => close(false)}>
                Cancel
              </Button>
              <Button disabled={!date || run.isPending} onClick={() => date && run.mutate(date)}>
                <CalendarClock data-icon="inline-start" />
                {run.isPending ? "Running…" : "Run cut-off"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CutoffResult({ date, summary }: { date: string; summary: CutoffSummary }) {
  const rows = [
    { label: "Placed orders confirmed", value: summary.confirmedCount, href: `/orders?dates=${date}..${date}&status=CONFIRMED` },
    { label: "Drafts cancelled", value: summary.cancelledCount, href: `/orders?dates=${date}..${date}&status=CANCELLED` },
    { label: "Skipped (not due yet, or changed meanwhile)", value: summary.skippedCount },
  ];
  const nothingNew = summary.confirmedCount + summary.cancelledCount === 0 && summary.failures.length === 0;
  return (
    <div className="flex flex-col gap-3">
      <p className="flex items-center gap-2 text-sm font-medium">
        <CircleCheck className="size-4 text-success" aria-hidden />
        {nothingNew ? `Nothing new to process for ${formatBusinessDate(date)}.` : `Processed ${formatBusinessDate(date)}.`}
      </p>
      <dl className="divide-y rounded-lg border">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between px-3 py-2 text-sm">
            <dt>{row.href && row.value > 0 ? <Link href={row.href} className="text-primary hover:underline">{row.label}</Link> : row.label}</dt>
            <dd className="num font-semibold">{formatCount(row.value)}</dd>
          </div>
        ))}
      </dl>
      {summary.failures.length > 0 && (
        <div className="rounded-lg border border-danger/30 bg-danger-soft p-3 text-sm text-danger">
          <p className="flex items-center gap-2 font-medium">
            <TriangleAlert className="size-4" aria-hidden /> {summary.failures.length} order(s) failed. Run it again to retry.
          </p>
          <ul className="mt-1 list-disc pl-5">
            {summary.failures.map((failure) => (
              <li key={failure.orderId}>
                <Link href={`/orders/${failure.orderId}`} className="underline">Order</Link>: {failure.message}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
