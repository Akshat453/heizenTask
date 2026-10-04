"use client";

import { Lock } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AccessDenied } from "@/components/app/access-denied";
import { EmptyState } from "@/components/app/empty-state";
import { ErrorState } from "@/components/app/error-state";
import { useAuth } from "@/components/auth/auth-provider";
import { OrderBuilder } from "@/components/orders/builder/order-builder";
import { useOrder } from "@/components/orders/queries";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { P } from "@/lib/permissions";

export default function EditOrderPage() {
  const { id } = useParams<{ id: string }>();
  const { can } = useAuth();
  const order = useOrder(id);

  if (!can(P.ordersEdit)) return <AccessDenied className="py-24" />;
  if (order.isLoading) return <Skeleton className="m-6 h-96" />;
  if (order.error || !order.data)
    return (
      <main className="p-4 md:p-6">
        <ErrorState error={order.error} title="Could not load this order" onRetry={() => void order.refetch()} />
      </main>
    );
  if (order.data.status !== "DRAFT" && order.data.status !== "PLACED")
    return (
      <EmptyState
        className="py-24"
        icon={Lock}
        title="This order can no longer be edited"
        description="Only draft and placed orders can be changed before their cut-off. Admins can still change delivery details from the order page."
        action={<Button render={<Link href={`/orders/${id}`} />} nativeButton={false}>Back to order</Button>}
      />
    );
  // key: remount with fresh state when the order changes.
  return <OrderBuilder key={order.data.updatedAt} order={order.data} />;
}
