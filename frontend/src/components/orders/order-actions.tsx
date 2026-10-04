"use client";

import { Ban, ChefHat, CircleX, Pencil, Send, Truck } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ordersApi, type OrderDetail } from "@/lib/api";
import { formatBusinessDate, toIsoDate } from "@/lib/format";
import { P } from "@/lib/permissions";
import { OverrideDeliveryDialog } from "./override-delivery-dialog";
import type { OrderContext } from "./use-order-context";
import { useOrderMutation } from "./use-order-mutation";

type Dialog = "place" | "cancel" | "reject" | "override" | "force" | null;

/**
 * Buttons are offered from the order status and the API's cut-off/drop state;
 * the server still decides and a refusal comes back as a toast.
 */
export function OrderActions({ order, ctx }: { order: OrderDetail; ctx: OrderContext }) {
  const { can } = useAuth();
  const [dialog, setDialog] = useState<Dialog>(null);
  const [reason, setReason] = useState("");
  const close = () => setDialog(null);

  const cutoffPassed = ctx.cutoff.data?.passed ?? false;
  const departed = ctx.drop.data?.status === "OUT_FOR_DELIVERY" || ctx.drop.data?.status === "DELIVERED";
  const editable = (order.status === "DRAFT" || order.status === "PLACED") && !cutoffPassed;
  const date = formatBusinessDate(toIsoDate(order.deliveryDate));
  const wasConfirmed = order.status === "CONFIRMED";

  const place = useOrderMutation(order.id, () => ordersApi.place(order.id), "Order placed", { onDone: close });
  const cancel = useOrderMutation(order.id, () => ordersApi.cancel(order.id), "Order cancelled", { onDone: close });
  const reject = useOrderMutation(order.id, (r: string) => ordersApi.reject(order.id, r), "Order rejected", { onDone: close });
  const force = useOrderMutation(order.id, () => ordersApi.forceComplete(order.id), "Kitchen work completed", { onDone: close });

  const show = {
    edit: can(P.ordersEdit) && editable,
    place: can(P.ordersEdit) && order.status === "DRAFT" && !cutoffPassed,
    cancel: can(P.ordersEdit) && ["DRAFT", "PLACED", "CONFIRMED"].includes(order.status) && !departed,
    reject: can(P.ordersOverride) && order.status === "PLACED",
    override: can(P.ordersOverride) && (order.status === "PLACED" || order.status === "CONFIRMED") && !departed,
    force: can(P.kitchenForceComplete) && order.status === "CONFIRMED" && !order.kitchenReadyAt,
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {show.cancel && (
        <Button variant="outline" onClick={() => setDialog("cancel")}>
          <Ban data-icon="inline-start" /> Cancel order
        </Button>
      )}
      {show.reject && (
        <Button variant="outline" onClick={() => setDialog("reject")}>
          <CircleX data-icon="inline-start" /> Reject
        </Button>
      )}
      {show.override && (
        <Button variant="outline" onClick={() => setDialog("override")}>
          <Truck data-icon="inline-start" /> Change delivery details
        </Button>
      )}
      {show.force && (
        <Button variant="outline" onClick={() => setDialog("force")}>
          <ChefHat data-icon="inline-start" /> Force complete
        </Button>
      )}
      {show.edit && (
        <Button variant={show.place ? "outline" : "default"} render={<Link href={`/orders/${order.id}/edit`} />} nativeButton={false}>
          <Pencil data-icon="inline-start" /> Edit
        </Button>
      )}
      {show.place && (
        <Button onClick={() => setDialog("place")}>
          <Send data-icon="inline-start" /> Place order
        </Button>
      )}

      <ConfirmDialog
        open={dialog === "place"}
        onOpenChange={(o) => !o && close()}
        title="Place this order?"
        description={`The order joins the ${date} kitchen plan. It stays editable until the cut-off, when it is confirmed and its prices freeze.`}
        confirmLabel="Place order"
        pending={place.isPending}
        onConfirm={() => place.mutate(undefined)}
      />
      <ConfirmDialog
        open={dialog === "cancel"}
        onOpenChange={(o) => !o && close()}
        title="Cancel this order?"
        description={
          wasConfirmed
            ? "This order is already confirmed, so it stays fully billable to the company at its frozen amount. It is removed from active kitchen and dispatch work and leaves its drop before departure. This cannot be undone."
            : "The order is cancelled and will not be cooked or billed. This cannot be undone."
        }
        confirmLabel="Cancel order"
        cancelLabel="Keep order"
        destructive
        pending={cancel.isPending}
        onConfirm={() => cancel.mutate(undefined)}
      />
      <ConfirmDialog
        open={dialog === "force"}
        onOpenChange={(o) => !o && close()}
        title="Force complete kitchen work?"
        description="Every unfinished prep unit is marked done now and the order becomes ready for dispatch. Use this only when the food is actually ready."
        confirmLabel="Force complete"
        pending={force.isPending}
        onConfirm={() => force.mutate(undefined)}
      />
      <ConfirmDialog
        open={dialog === "reject"}
        onOpenChange={(o) => {
          if (!o) {
            close();
            setReason("");
          }
        }}
        title="Reject this order?"
        description={
          <span className="flex flex-col gap-2">
            <span>The order is rejected, will not be cooked and is not billable. The reason is recorded on the order.</span>
            <Label htmlFor="reject-reason" className="mt-1 text-foreground">Reason</Label>
            <Textarea id="reject-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Employee left the company" />
          </span>
        }
        confirmLabel="Reject order"
        destructive
        pending={reject.isPending}
        confirmDisabled={!reason.trim()}
        onConfirm={() => reject.mutate(reason.trim())}
      />
      {dialog === "override" && <OverrideDeliveryDialog order={order} company={ctx.company.data} open onOpenChange={(o) => !o && close()} />}
    </div>
  );
}
