"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { describeError } from "@/lib/api-client";
import { DROP_STATUS_LABEL, dispatchApi, type DispatchDrop } from "@/lib/api";

export default function DispatchPage() {
  const { can } = useAuth();
  // Initial filter only; every query is evaluated in the configured business timezone by the API.
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [drops, setDrops] = useState<DispatchDrop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;
    dispatchApi
      .list(date)
      .then((response) => {
        if (!active) return;
        setDrops(response.data);
        setError(null);
      })
      .catch((err: unknown) => active && setError(describeError(err)))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [date, refreshKey]);

  const refresh = () => {
    setLoading(true);
    setRefreshKey((key) => key + 1);
  };

  const run = async (action: () => Promise<unknown>) => {
    try {
      await action();
      refresh();
    } catch (err: unknown) {
      alert(describeError(err));
    }
  };

  const reconcile = () => run(() => dispatchApi.reconcile());

  const assignDriver = (dropId: string) => {
    const driverId = prompt("Enter driver ID (UUID):");
    if (!driverId) return;
    return run(() => dispatchApi.assignDriver(dropId, driverId));
  };

  const markOutForDelivery = (dropId: string) => run(() => dispatchApi.outForDelivery(dropId));

  const viewProof = async (dropId: string) => {
    try {
      const { url } = await dispatchApi.proofUrl(dropId);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err: unknown) {
      alert(describeError(err));
    }
  };

  if (!can("dispatch.read")) {
    return <div className="p-8 text-destructive">Unauthorized: Dispatch read required.</div>;
  }

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Dispatch Board</h1>
          <p className="text-muted-foreground mt-1">Manage delivery drops</p>
        </div>
        {can("dispatch.update") && (
          <Button variant="outline" onClick={reconcile}>
            Reconcile Groups
          </Button>
        )}
      </div>

      <div className="flex items-end gap-4 bg-card p-4 rounded-xl border border-border/40 shadow-sm">
        <div className="space-y-2">
          <Label>Business Date</Label>
          <Input type="date" value={date} onChange={(e) => { setLoading(true); setDate(e.target.value); }} className="w-[200px]" />
        </div>
        <Button onClick={refresh} variant="secondary">Refresh</Button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground animate-pulse">Loading drops...</div>
      ) : error ? (
        <div className="p-4 bg-destructive/10 text-destructive rounded-lg border border-destructive/20">{error}</div>
      ) : drops.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground bg-muted/20 rounded-xl border border-dashed border-border">
          No drops found for this date.
        </div>
      ) : (
        <div className="grid gap-4">
          {drops.map((drop) => (
            <Card key={drop.id} className="overflow-hidden hover:shadow-md transition-shadow">
              <CardHeader className="bg-muted/30 pb-4 border-b border-border/40 flex flex-row items-start justify-between space-y-0">
                <div>
                  <CardTitle className="text-xl flex items-center gap-3">
                    {drop.company.name}
                    <Badge variant={
                      drop.status === "DELIVERED" ? "secondary" : 
                      drop.status === "OUT_FOR_DELIVERY" ? "default" : "outline"
                    }>
                      {DROP_STATUS_LABEL[drop.status]}
                    </Badge>
                    {drop.onTime !== null && (
                      <Badge variant={drop.onTime ? "secondary" : "destructive"}>{drop.onTime ? "On time" : "Late"}</Badge>
                    )}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1.5 font-medium">
                    {new Date(drop.scheduledDeliveryAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {drop.addressLabelSnapshot}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-foreground">
                    {drop._count.orders} Order{drop._count.orders !== 1 ? 's' : ''}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-4 flex items-center justify-between">
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">Driver</div>
                  <div className="font-medium text-foreground">
                    {drop.driver?.name || <span className="text-destructive font-semibold">Unassigned</span>}
                  </div>
                </div>
                <div className="flex gap-2">
                  {drop.status === "DISPATCH_READY" && can("dispatch.assign_driver") && (
                    <Button variant="outline" size="sm" onClick={() => assignDriver(drop.id)}>
                      {drop.driverStaffUserId ? "Change Driver" : "Assign Driver"}
                    </Button>
                  )}
                  {drop.status === "DISPATCH_READY" && can("dispatch.update") && (
                    <Button size="sm" onClick={() => markOutForDelivery(drop.id)}>
                      Out for Delivery
                    </Button>
                  )}
                  {drop.status === "DELIVERED" && drop.photoUrl && (
                    <Button variant="secondary" size="sm" onClick={() => viewProof(drop.id)}>
                      View Proof
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
