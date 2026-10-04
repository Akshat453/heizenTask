'use client';

import { useEffect, useState } from 'react';
import { describeError } from '@/lib/api-client';
import { dashboardApi, type DispatchDashboardData } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Truck, PackageCheck, Users, AlertCircle } from 'lucide-react';

export function DispatchDashboard() {
  const [data, setData] = useState<DispatchDashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // The API returns { businessDate, metrics } directly (no `data` envelope).
    dashboardApi
      .dispatch()
      .then(setData)
      .catch((err: unknown) => setError(describeError(err, 'Failed to load dashboard')));
  }, []);

  if (error) {
    return <div className="p-8 text-destructive">{error}</div>;
  }

  return (
    <div className="space-y-6 p-8 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dispatch Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          {data ? `Overview for business date: ${data.businessDate}` : 'Loading...'}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Dispatch Ready */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Dispatch Ready</CardTitle>
            <PackageCheck className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {!data ? <Skeleton className="h-8 w-16" /> : data.metrics.dispatchReady}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Ready for pickup</p>
          </CardContent>
        </Card>

        {/* Unassigned */}
        <Card className={(data?.metrics.unassigned ?? 0) > 0 ? "border-orange-500/50 bg-orange-500/5" : ""}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unassigned</CardTitle>
            <Users className={`h-4 w-4 ${(data?.metrics.unassigned ?? 0) > 0 ? "text-orange-500" : "text-muted-foreground"}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {!data ? <Skeleton className="h-8 w-16" /> : data.metrics.unassigned}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Ready but no driver</p>
          </CardContent>
        </Card>

        {/* Out For Delivery */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Out for Delivery</CardTitle>
            <Truck className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {!data ? <Skeleton className="h-8 w-16" /> : data.metrics.outForDelivery}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Currently in transit</p>
          </CardContent>
        </Card>

        {/* Late Deliveries */}
        <Card className={(data?.metrics.lateDeliveries ?? 0) > 0 ? "border-destructive/50 bg-destructive/5" : ""}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Late Deliveries</CardTitle>
            <AlertCircle className={`h-4 w-4 ${(data?.metrics.lateDeliveries ?? 0) > 0 ? "text-destructive" : "text-muted-foreground"}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {!data ? <Skeleton className="h-8 w-16" /> : data.metrics.lateDeliveries}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Past scheduled delivery</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
