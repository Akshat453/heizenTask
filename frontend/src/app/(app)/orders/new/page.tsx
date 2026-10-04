"use client";

import { AccessDenied } from "@/components/app/access-denied";
import { useAuth } from "@/components/auth/auth-provider";
import { OrderBuilder } from "@/components/orders/builder/order-builder";
import { P } from "@/lib/permissions";

export default function NewOrderPage() {
  const { can } = useAuth();
  if (!can(P.ordersCreate)) return <AccessDenied className="py-24" />;
  return <OrderBuilder />;
}
