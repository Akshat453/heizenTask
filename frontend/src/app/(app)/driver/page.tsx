"use client";

import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { describeError } from "@/lib/api-client";
import { DROP_STATUS_LABEL, driverApi, type DriverDrop } from "@/lib/api";

export default function DriverPage() {
  const { can } = useAuth();
  const [drops, setDrops] = useState<DriverDrop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const [deliveryNote, setDeliveryNote] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeDropId, setActiveDropId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    driverApi
      .today()
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
  }, [refreshKey]);

  const refresh = () => {
    setLoading(true);
    setRefreshKey((key) => key + 1);
  };

  const handleDeliver = async (dropId: string) => {
    setSubmitting(true);
    try {
      // The photo is optional proof; a note-only delivery is valid.
      await driverApi.deliver(dropId, { note: deliveryNote, photo: fileInputRef.current?.files?.[0] ?? null });
      setActiveDropId(null);
      setDeliveryNote("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      refresh();
    } catch (err: unknown) {
      alert(describeError(err, "Failed to record delivery"));
    } finally {
      setSubmitting(false);
    }
  };

  if (!can("driver.own_drops.read")) {
    return <div className="p-8 text-destructive">Unauthorized: Driver access required.</div>;
  }

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-6">
      <div className="flex justify-between items-center bg-card p-6 rounded-xl border border-border/40 shadow-sm">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">My Deliveries</h1>
          <p className="text-muted-foreground mt-1">Today&apos;s assigned route</p>
        </div>
        <Button onClick={refresh} variant="secondary">Refresh Route</Button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground animate-pulse">Loading route...</div>
      ) : error ? (
        <div className="p-4 bg-destructive/10 text-destructive rounded-lg border border-destructive/20">{error}</div>
      ) : drops.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground bg-muted/20 rounded-xl border border-dashed border-border">
          No deliveries assigned for today.
        </div>
      ) : (
        <div className="grid gap-6">
          {drops.map((drop) => (
            <Card key={drop.id} className="overflow-hidden border-2 transition-colors hover:border-primary/50">
              <CardHeader className="bg-muted/20 border-b border-border/40">
                <CardTitle className="flex justify-between items-start">
                  <div>
                    <div className="text-xl">{drop.company.name}</div>
                    <div className="text-sm text-muted-foreground mt-1 font-normal">
                      {new Date(drop.scheduledDeliveryAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  <Badge variant={
                    drop.status === "DELIVERED" ? "secondary" : 
                    drop.status === "OUT_FOR_DELIVERY" ? "default" : "outline"
                  } className="text-sm px-3 py-1">
                    {DROP_STATUS_LABEL[drop.status]}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div>
                  <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">Delivery Address</h4>
                  <p className="text-foreground font-medium">{drop.addressLabelSnapshot}</p>
                  <p className="text-muted-foreground text-sm">{drop.addressLine1Snapshot}</p>
                  {drop.addressLine2Snapshot && <p className="text-muted-foreground text-sm">{drop.addressLine2Snapshot}</p>}
                  <p className="text-muted-foreground text-sm">
                    {drop.addressCitySnapshot}, {drop.addressRegionSnapshot} {drop.addressPostalCodeSnapshot}
                  </p>
                </div>

                {drop.company.driverInstructions && (
                  <div className="bg-amber-500/10 text-amber-600 dark:text-amber-400 p-4 rounded-lg border border-amber-500/20">
                    <h4 className="text-sm font-semibold uppercase tracking-wider mb-1 flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                      Instructions
                    </h4>
                    <p className="text-sm">{drop.company.driverInstructions}</p>
                  </div>
                )}

                <div className="flex justify-between items-center py-2 border-t border-border/40 mt-4">
                  <span className="text-muted-foreground">Orders to deliver:</span>
                  <span className="font-bold text-lg">{drop._count.orders}</span>
                </div>
                {drop.onTime !== null && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Delivered:</span>
                    <Badge variant={drop.onTime ? "secondary" : "destructive"}>{drop.onTime ? "On time" : "Late"}</Badge>
                  </div>
                )}
              </CardContent>

              {drop.status === "OUT_FOR_DELIVERY" && can("driver.own_drops.deliver") && (
                <CardFooter className="bg-muted/10 border-t border-border/40 p-6 flex-col gap-4 items-stretch">
                  {activeDropId === drop.id ? (
                    <div className="space-y-4 animate-in fade-in slide-in-from-top-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Delivery Photo Proof (Optional — JPEG, PNG or WebP, max 5 MB)</label>
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          capture="environment"
                          ref={fileInputRef}
                          className="w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Notes (Optional)</label>
                        <Textarea 
                          placeholder="e.g., Left at reception with John"
                          value={deliveryNote}
                          onChange={(e) => setDeliveryNote(e.target.value)}
                        />
                      </div>
                      <div className="flex gap-3">
                        <Button className="flex-1" disabled={submitting} onClick={() => handleDeliver(drop.id)}>{submitting ? "Submitting..." : "Submit Delivery"}</Button>
                        <Button variant="outline" onClick={() => setActiveDropId(null)}>Cancel</Button>
                      </div>
                    </div>
                  ) : (
                    <Button size="lg" className="w-full text-lg h-14" onClick={() => setActiveDropId(drop.id)}>
                      Complete Delivery
                    </Button>
                  )}
                </CardFooter>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
