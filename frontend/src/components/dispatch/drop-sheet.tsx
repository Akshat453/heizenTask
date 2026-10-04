"use client";

import { useQuery } from "@tanstack/react-query";
import { Camera, Check } from "lucide-react";
import Link from "next/link";
import { StatusBadge } from "@/components/app/status-badge";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { companiesApi, type DispatchDrop } from "@/lib/api";
import { formatBusinessDateTime, formatBusinessTime, formatCount } from "@/lib/format";
import { P } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { addressLine, dropSize, packagingText } from "./dispatch-model";

type Props = { drop: DispatchDrop; timeZone: string; onClose: () => void; onViewPhoto: (drop: DispatchDrop) => void };

export function DropSheet({ drop, timeZone, onClose, onViewPhoto }: Props) {
  const { can } = useAuth();
  const company = useQuery({
    queryKey: ["companies", "detail", drop.companyId],
    queryFn: () => companiesApi.get(drop.companyId),
    enabled: can(P.companiesRead),
    staleTime: 60_000,
  });
  const steps = [
    { label: "Ready to leave", at: drop.dispatchReadyAt },
    { label: "Out for delivery", at: drop.outForDeliveryAt },
    { label: "Delivered", at: drop.deliveredAt },
  ];

  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full gap-0 overflow-y-auto sm:max-w-lg">
        <SheetHeader className="border-b">
          <SheetTitle className="flex items-center gap-2">
            {drop.company.name} <StatusBadge kind="drop" value={drop.status} size="sm" />
          </SheetTitle>
          <SheetDescription>
            Delivery <span className="num">{formatBusinessTime(drop.scheduledDeliveryAt, timeZone)}</span> · {dropSize(drop)} · driver{" "}
            {drop.driver?.name ?? "not assigned"}
          </SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-5 p-4 text-sm">
          <section>
            <h3 className="label-caps mb-1 text-muted-foreground">Address</h3>
            <p className="font-medium">{drop.addressLabelSnapshot}</p>
            <p>{addressLine(drop)}</p>
          </section>
          <section>
            <h3 className="label-caps mb-1 text-muted-foreground">Driver instructions</h3>
            {company.isLoading ? <Skeleton className="h-5 w-48" /> : <p>{company.data?.driverInstructions || "None"}</p>}
          </section>
          <section>
            <h3 className="label-caps mb-1 text-muted-foreground">Orders ({drop.orders.length})</h3>
            <ul className="divide-y rounded-md border">
              {drop.orders.map((o) => (
                <li key={o.id} className="flex items-center justify-between gap-2 px-3 py-2">
                  {can(P.ordersRead) ? (
                    <Link href={`/orders/${o.id}`} className="num text-primary hover:underline">{o.orderNumber}</Link>
                  ) : (
                    <span className="num">{o.orderNumber}</span>
                  )}
                  <span className="min-w-0 flex-1 truncate text-muted-foreground">{o.employeeName}</span>
                  <span className="text-xs text-muted-foreground">{o.packagingName}</span>
                  <span className="num w-16 text-right">{formatCount(o.meals)} meal{o.meals === 1 ? "" : "s"}</span>
                </li>
              ))}
            </ul>
            {drop.packaging.length > 0 && <p className="mt-2 text-muted-foreground">Packaging: {packagingText(drop.packaging)}</p>}
          </section>
          <section>
            <h3 className="label-caps mb-2 text-muted-foreground">Timeline</h3>
            <ol className="flex flex-col gap-2">
              {steps.map((step) => (
                <li key={step.label} className={cn("flex items-center gap-2", !step.at && "text-muted-foreground")}>
                  <span className={cn("grid size-5 place-items-center rounded-full border", step.at && "border-success/30 bg-success-soft text-success")}>
                    {step.at && <Check className="size-3" />}
                  </span>
                  {step.label}
                  {step.at && <span className="num ml-auto text-xs text-muted-foreground">{formatBusinessDateTime(step.at, timeZone)}</span>}
                </li>
              ))}
            </ol>
          </section>
          {drop.status === "DELIVERED" && (
            <section>
              <h3 className="label-caps mb-1 text-muted-foreground">Proof of delivery</h3>
              <p>{drop.deliveryNote ? `“${drop.deliveryNote}”` : "No note."}</p>
              {drop.photoUrl ? (
                <Button variant="outline" size="sm" className="mt-2" onClick={() => onViewPhoto(drop)}>
                  <Camera data-icon="inline-start" /> View photo
                </Button>
              ) : (
                <p className="text-muted-foreground">No photo (optional).</p>
              )}
            </section>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
