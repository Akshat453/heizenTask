/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useState } from 'react';
import { apiRequest } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ChefHat, AlertTriangle, Clock, Flame } from 'lucide-react';
import { format, parseISO } from 'date-fns';

export function KitchenDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const res = await apiRequest<any>('/dashboard/kitchen');
        setData(res.data);
      } catch (err: any) {
        setError(err.message || 'Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    }
    fetchDashboard();
  }, []);

  if (error) {
    return <div className="p-8 text-destructive">{error}</div>;
  }

  return (
    <div className="space-y-6 p-8 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Kitchen Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          {data ? `Overview for business date: ${data.businessDate}` : 'Loading...'}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Not Started */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Not Started</CardTitle>
            <ChefHat className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? <Skeleton className="h-8 w-16" /> : data.metrics.notStarted}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Prep units queued</p>
          </CardContent>
        </Card>

        {/* Started */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Flame className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? <Skeleton className="h-8 w-16" /> : data.metrics.started}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Currently cooking</p>
          </CardContent>
        </Card>

        {/* At Risk */}
        <Card className={data?.metrics.atRisk > 0 ? "border-orange-500/50 bg-orange-500/5" : ""}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">At Risk</CardTitle>
            <AlertTriangle className={`h-4 w-4 ${data?.metrics.atRisk > 0 ? "text-orange-500" : "text-muted-foreground"}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? <Skeleton className="h-8 w-16" /> : data.metrics.atRisk}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Nearing deadline</p>
          </CardContent>
        </Card>

        {/* Late */}
        <Card className={data?.metrics.late > 0 ? "border-destructive/50 bg-destructive/5" : ""}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Late</CardTitle>
            <AlertTriangle className={`h-4 w-4 ${data?.metrics.late > 0 ? "text-destructive" : "text-muted-foreground"}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? <Skeleton className="h-8 w-16" /> : data.metrics.late}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Past planned ready time</p>
          </CardContent>
        </Card>
      </div>

      {/* Next Deadline */}
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Next Deadline
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-64" />
            </div>
          ) : data.metrics.nextDeadline ? (
            <div>
              <div className="text-xl font-medium">
                {format(parseISO(data.metrics.nextDeadline.plannedKitchenReadyAt), 'h:mm a')}
              </div>
              <p className="text-muted-foreground mt-1">
                {data.metrics.nextDeadline.companyName} (Order #{data.metrics.nextDeadline.orderNumber})
                — {data.metrics.nextDeadline.remainingUnits} units remaining
              </p>
            </div>
          ) : (
            <p className="text-muted-foreground">All caught up! No active work in the kitchen.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
