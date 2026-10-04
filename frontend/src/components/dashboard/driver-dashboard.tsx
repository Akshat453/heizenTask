'use client';

import { useEffect, useState } from 'react';
import { describeError } from '@/lib/api-client';
import { dashboardApi, type DriverDashboardData } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Truck, MapPin, CheckCircle2, Clock } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Badge } from '@/components/ui/badge';

export function DriverDashboard() {
  const [data, setData] = useState<DriverDashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // The API returns { businessDate, metrics } directly (no `data` envelope).
    dashboardApi
      .driver()
      .then(setData)
      .catch((err: unknown) => setError(describeError(err, 'Failed to load dashboard')));
  }, []);

  if (error) {
    return <div className="p-8 text-destructive">{error}</div>;
  }

  return (
    <div className="space-y-6 p-8 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Driver Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          {data ? `Overview for business date: ${data.businessDate}` : 'Loading...'}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {/* Today's Drops */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today&apos;s Route</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {!data ? <Skeleton className="h-8 w-16" /> : data.metrics.todayDrops}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Total assigned drops</p>
          </CardContent>
        </Card>

        {/* Remaining */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Remaining Drops</CardTitle>
            <Truck className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {!data ? <Skeleton className="h-8 w-16" /> : data.metrics.remaining}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Not yet delivered</p>
          </CardContent>
        </Card>

        {/* Delivered */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {!data ? <Skeleton className="h-8 w-16" /> : data.metrics.delivered}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Delivered today</p>
          </CardContent>
        </Card>
      </div>

      {/* Next Drop */}
      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Next Drop
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!data ? (
            <div className="space-y-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-64" />
            </div>
          ) : data.metrics.nextDrop ? (
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-xl font-medium">
                  {format(parseISO(data.metrics.nextDrop.scheduledDeliveryAt), 'h:mm a')}
                </span>
                <Badge variant={data.metrics.nextDrop.status === 'OUT_FOR_DELIVERY' ? 'default' : 'secondary'}>
                  {data.metrics.nextDrop.status === 'OUT_FOR_DELIVERY' ? 'Out for Delivery' : 'Dispatch Ready'}
                </Badge>
              </div>
              <p className="text-muted-foreground">
                {data.metrics.nextDrop.companyName}
                {data.metrics.nextDrop.addressCitySnapshot && ` • ${data.metrics.nextDrop.addressCitySnapshot}`}
              </p>
            </div>
          ) : (
            <p className="text-muted-foreground">No upcoming drops scheduled for today.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
