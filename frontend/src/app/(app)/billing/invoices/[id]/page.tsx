"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Leaf } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { AccessDenied } from "@/components/app/access-denied";
import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { ErrorState } from "@/components/app/error-state";
import { PageHeader } from "@/components/app/page-header";
import { StatusBadge } from "@/components/app/status-badge";
import { useAuth } from "@/components/auth/auth-provider";
import { billingKeys } from "@/components/billing/queries";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useBusinessClock } from "@/hooks/use-business-clock";
import { billingApi } from "@/lib/api";
import { CONFLICT_MESSAGE, describeError, isApiError } from "@/lib/api-client";
import { businessDateOf, formatBusinessDate, formatBusinessDateLong, formatMoney } from "@/lib/format";
import { P } from "@/lib/permissions";

export default function InvoicePage() {
  const { id } = useParams<{ id: string }>();
  const { can } = useAuth();
  const { timeZone } = useBusinessClock();
  const queryClient = useQueryClient();
  const [confirming, setConfirming] = useState(false);
  const invoice = useQuery({ queryKey: billingKeys.invoice(id), queryFn: () => billingApi.getInvoice(id), enabled: can(P.billingRead) });
  const pay = useMutation({
    mutationFn: () => billingApi.markPaid(id),
    onSuccess: () => toast.success("Invoice marked as paid"),
    onError: (error) => toast.error(isApiError(error, 409) ? CONFLICT_MESSAGE : describeError(error)),
    onSettled: () => {
      setConfirming(false);
      void queryClient.invalidateQueries({ queryKey: billingKeys.all });
    },
  });

  if (!can(P.billingRead)) return <AccessDenied className="py-24" />;
  if (invoice.isLoading) return <Skeleton className="mx-auto my-6 h-[640px] w-full max-w-[820px]" />;
  if (invoice.error || !invoice.data)
    return (
      <main className="p-4 md:p-6">
        <ErrorState error={invoice.error} title="Could not load this invoice" onRetry={() => void invoice.refetch()} />
      </main>
    );
  const inv = invoice.data;
  const day = (instant: string) => formatBusinessDateLong(businessDateOf(instant, timeZone));

  return (
    <main className="flex flex-col gap-6 p-4 md:p-6">
      <PageHeader
        title={`Invoice ${inv.invoiceNumber}`}
        description={inv.company.name}
        actions={
          inv.status === "UNPAID" &&
          can(P.billingManage) && (
            <Button onClick={() => setConfirming(true)}>
              <CheckCircle2 data-icon="inline-start" /> Mark as paid
            </Button>
          )
        }
      />
      <article className="mx-auto w-full max-w-[820px] rounded-lg border bg-card p-6 text-card-foreground shadow-sm md:p-10">
        <header className="flex flex-wrap items-start justify-between gap-6 border-b pb-6">
          <div className="flex items-center gap-2">
            <Leaf className="size-6 text-primary" aria-hidden />
            <span className="font-heading text-xl font-semibold">Fernleaf Kitchen</span>
          </div>
          <div className="text-right text-sm">
            <p className="font-mono text-lg font-semibold">{inv.invoiceNumber}</p>
            <p>Issued {day(inv.createdAt)}</p>
            <div className="mt-2 flex justify-end"><StatusBadge kind="invoice" value={inv.status} size="sm" /></div>
            {inv.paidAt && <p className="mt-1">Paid {day(inv.paidAt)}</p>}
          </div>
        </header>
        <section className="py-6 text-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Bill to</p>
          <p className="mt-1 font-medium">{inv.company.name}</p>
          <p>{inv.company.billingContactName}</p>
          <p className="text-muted-foreground">{inv.company.billingContactEmail}</p>
        </section>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order #</TableHead>
              <TableHead>Delivery date</TableHead>
              <TableHead>Employee</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {inv.orders.map((line) => (
              <TableRow key={line.orderId}>
                <TableCell className="font-mono">
                  {can(P.ordersRead) ? <Link href={`/orders/${line.orderId}`} className="underline-offset-4 hover:underline">{line.order.orderNumber}</Link> : line.order.orderNumber}
                </TableCell>
                <TableCell>{formatBusinessDate(line.order.deliveryDate, { withYear: true })}</TableCell>
                <TableCell>{line.order.employee.name}</TableCell>
                <TableCell className="text-right font-mono tabular-nums">{formatMoney(line.amountCents)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell colSpan={3} className="font-semibold">Total ({inv.orders.length} {inv.orders.length === 1 ? "order" : "orders"})</TableCell>
              <TableCell className="text-right font-mono text-base font-semibold tabular-nums">{formatMoney(inv.totalCents)}</TableCell>
            </TableRow>
          </TableFooter>
        </Table>
        <p className="mt-6 text-xs text-muted-foreground">Amounts are the billable totals frozen when each order was confirmed. Invoices are immutable.</p>
      </article>
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={`Mark ${inv.invoiceNumber} as paid?`}
        description={`Records ${formatMoney(inv.totalCents)} from ${inv.company.name} as paid today. This cannot be undone.`}
        confirmLabel="Mark as paid"
        pending={pay.isPending}
        onConfirm={() => pay.mutate()}
      />
    </main>
  );
}
