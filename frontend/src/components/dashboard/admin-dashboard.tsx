'use client';

import { useEffect, useState } from 'react';
import { describeError } from '@/lib/api-client';
import { dashboardApi, type AdminDashboardData } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, CircleDollarSign, AlertCircle, Truck } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

function formatCurrency(cents: number) {
  return (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

export function AdminDashboard() {
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // The API returns { businessDate, metrics } directly (no `data` envelope).
    dashboardApi
      .admin()
      .then(setData)
      .catch((err: unknown) => setError(describeError(err, 'Failed to load dashboard')));
  }, []);

  if (error) {
    return <div className="p-8 text-destructive">{error}</div>;
  }

  return (
    <div className="space-y-6 p-8 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          {data ? `Overview for business date: ${data.businessDate}` : 'Loading...'}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Today's Orders */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today&apos;s Active Orders</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {!data ? <Skeleton className="h-8 w-20" /> : data.metrics.todayOrders}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Excludes cancelled & rejected</p>
          </CardContent>
        </Card>

        {/* Today's Billable Value */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today&apos;s Billable Value</CardTitle>
            <CircleDollarSign className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {!data ? <Skeleton className="h-8 w-24" /> : formatCurrency(data.metrics.todayBillableCents)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Includes confirmed-then-cancelled</p>
          </CardContent>
        </Card>

        {/* Uninvoiced Amount */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Uninvoiced</CardTitle>
            <CircleDollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {!data ? <Skeleton className="h-8 w-24" /> : formatCurrency(data.metrics.uninvoicedCents)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">All dates</p>
          </CardContent>
        </Card>

        {/* Late Kitchen Work */}
        <Card className={(data?.metrics.lateKitchenOrders ?? 0) > 0 ? "border-destructive/50 bg-destructive/5" : ""}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Late Kitchen Work</CardTitle>
            <AlertCircle className={`h-4 w-4 ${(data?.metrics.lateKitchenOrders ?? 0) > 0 ? "text-destructive" : "text-muted-foreground"}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {!data ? <Skeleton className="h-8 w-16" /> : `${data.metrics.lateKitchenOrders} orders`}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {!data ? '...' : `${data.metrics.latePrepUnits} prep units`}
            </p>
          </CardContent>
        </Card>

        {/* Active Deliveries */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Deliveries</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {!data ? <Skeleton className="h-8 w-16" /> : data.metrics.activeDeliveries}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Ready or Out for delivery today</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
