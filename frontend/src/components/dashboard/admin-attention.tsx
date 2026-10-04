"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlarmClock, CalendarClock, Tags, Truck, UserX } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { Panel } from "@/components/app/panel";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { useBusinessClock } from "@/hooks/use-business-clock";
import { ordersApi, type AdminDashboardData, type CutoffInfo } from "@/lib/api";
import { CONFLICT_MESSAGE, describeError, isApiError } from "@/lib/api-client";
import { formatBusinessDate, formatBusinessTime, formatCount, formatDuration } from "@/lib/format";
import { DASHBOARD_PERMISSIONS, P } from "@/lib/permissions";
import { AttentionList, type AttentionItem } from "./attention-list";
import { useDispatchDashboard, useTodayDrops } from "./queries";
import { useTiersMissingPrices, useUnprocessedCutoff } from "./use-admin-attention-data";

type Props = { data: AdminDashboardData | undefined; cutoffWindow: CutoffInfo[] | undefined; loading: boolean };

const plural = (n: number, word: string) => `${formatCount(n)} ${word}${n === 1 ? "" : "s"}`;
const linkButton = (href: string, label: string) => (
  <Button size="sm" variant="outline" render={<Link href={href} />} nativeButton={false}>
    {label}
  </Button>
);

export function AdminAttention({ data, cutoffWindow, loading }: Props) {
  const { can } = useAuth();
  const { businessDate, timeZone } = useBusinessClock();
  const queryClient = useQueryClient();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const canDispatch = DASHBOARD_PERMISSIONS.dispatch.every(can);
  const dispatch = useDispatchDashboard(canDispatch);
  const drops = useTodayDrops(businessDate ?? undefined, can(P.dispatchRead));
  const cutoff = useUnprocessedCutoff(businessDate, cutoffWindow, can(P.ordersRead));
  const tiers = useTiersMissingPrices(can(P.pricingRead));

  const runCutoff = useMutation({
    mutationFn: () => ordersApi.processCutoff(),
    onSuccess: (summary) => {
      setConfirmOpen(false);
      const text = `Cut-off processed: ${summary.confirmedCount} confirmed, ${summary.cancelledCount} cancelled`;
      if (summary.failures.length) toast.warning(`${text}. ${plural(summary.failures.length, "order")} failed; run it again to retry.`);
      else toast.success(text);
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (error) => {
      setConfirmOpen(false);
      toast.error(isApiError(error, 409) ? CONFLICT_MESSAGE : describeError(error));
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  const items: AttentionItem[] = [];
  const m = data?.metrics;
  if (m && m.lateKitchenOrders > 0) {
    items.push({
      id: "late-kitchen",
      tone: "danger",
      icon: AlarmClock,
      text: `${plural(m.latePrepUnits, "prep unit")} across ${plural(m.lateKitchenOrders, "confirmed order")} are past their planned kitchen-ready time.`,
      action: linkButton("/kitchen", "Open kitchen board"),
    });
  }
  for (const drop of drops.data?.data ?? []) {
    if (drop.status !== "DELIVERED" || drop.onTime !== false || !drop.deliveredAt) continue;
    const lateMs = new Date(drop.deliveredAt).getTime() - new Date(drop.scheduledDeliveryAt).getTime();
    items.push({
      id: `late-drop-${drop.id}`,
      tone: "danger",
      icon: Truck,
      at: new Date(drop.scheduledDeliveryAt).getTime(),
      text: `${drop.company.name} drop due ${formatBusinessTime(drop.scheduledDeliveryAt, timeZone)} was delivered ${formatDuration(lateMs)} late.`,
      action: linkButton("/dispatch", "View in dispatch"),
    });
  }
  if (cutoff.data && cutoff.data.placed + cutoff.data.drafts > 0) {
    const { placed, drafts, upTo } = cutoff.data;
    items.push({
      id: "cutoff",
      tone: "warning",
      icon: CalendarClock,
      text: `${plural(placed, "placed order")} and ${plural(drafts, "draft")} delivering on or before ${formatBusinessDate(upTo)} are past cut-off but not processed yet.`,
      action: can(P.ordersOverride) ? (
        <Button size="sm" onClick={() => setConfirmOpen(true)}>
          Run cut-off
        </Button>
      ) : undefined,
    });
  }
  const unassigned = dispatch.data?.metrics.unassigned ?? 0;
  if (unassigned > 0) {
    items.push({
      id: "unassigned",
      tone: "warning",
      icon: UserX,
      text: `${plural(unassigned, "drop")} ${unassigned === 1 ? "is" : "are"} ready to leave today with no driver.`,
      action: linkButton("/dispatch", "Assign drivers"),
    });
  }
  for (const tier of tiers.data ?? []) {
    items.push({
      id: `tier-${tier.tierId}`,
      tone: "info",
      icon: Tags,
      text: `${tier.tierName}: ${plural(tier.dishes.length, "active dish")} ${tier.dishes.length === 1 ? "has" : "have"} no price, so ${tier.dishes.length === 1 ? "it is" : "they are"} hidden from menus on this tier (${tier.dishes.slice(0, 3).join(", ")}${tier.dishes.length > 3 ? ", …" : ""}).`,
      action: linkButton("/pricing", "Open pricing"),
    });
  }

  return (
    <Panel title="Needs attention" description="Most urgent first. Each item links to where it is fixed." flush>
      <AttentionList
        items={items}
        loading={loading || dispatch.isLoading || cutoff.isLoading}
        emptyText="No late kitchen work, unassigned drops, unprocessed cut-offs or unpriced dishes."
      />
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Run cut-off now?"
        description="Every order whose cut-off has passed is processed: drafts are cancelled and placed orders are confirmed with their prices frozen. Orders still before their cut-off are not touched. Running it again is safe."
        confirmLabel="Run cut-off"
        pending={runCutoff.isPending}
        onConfirm={() => runCutoff.mutate()}
      />
    </Panel>
  );
}
