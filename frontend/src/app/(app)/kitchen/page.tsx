"use client";

import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useAuth } from "@/components/auth/auth-provider";

type KitchenPrepState = "NOT_STARTED" | "STARTED" | "DONE";
type KitchenTimingState = "ON_TRACK" | "AT_RISK" | "LATE" | "COMPLETE";

interface KitchenBoardItem {
  id: string;
  orderId: string;
  orderNumber: string;
  companyName: string;
  employeeName: string;
  deliveryDate: string;
  deliveryAt: string;
  plannedKitchenReadyAt: string;
  
  dishNameSnapshot: string;
  quantity: number;
  stationId: string | null;
  stationNameSnapshot: string;
  options: {
    optionGroupNameSnapshot: string;
    optionNameSnapshot: string;
    portionNameSnapshot: string | null;
  }[];

  startedAt: string | null;
  doneAt: string | null;

  prepState: KitchenPrepState;
  timingState: KitchenTimingState;
}

export default function KitchenBoardPage() {
  const { user, can } = useAuth();
  
  const [date, setDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [stationId, setStationId] = useState<string>("all");
  const [items, setItems] = useState<KitchenBoardItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const hasUpdatePerm = can("kitchen.update");
  const hasForceCompletePerm = can("kitchen.force_complete");

  const loadData = async () => {
    setIsLoading(true);
    try {
      const url = new URL("/kitchen", window.location.origin);
      url.searchParams.set("date", date);
      if (stationId !== "all") {
        url.searchParams.set("stationId", stationId);
      }
      const data = await apiRequest<KitchenBoardItem[]>(`${url.pathname}${url.search}`);
      setItems(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load kitchen board");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
    const interval = setInterval(loadData, 30000); // Poll every 30s
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, stationId]);

  const handleStart = async (id: string) => {
    try {
      await apiRequest(`/kitchen/prep-units/${id}/start`, { method: "POST" });
      loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to start unit");
    }
  };

  const handleDone = async (id: string) => {
    try {
      await apiRequest(`/kitchen/prep-units/${id}/done`, { method: "POST" });
      loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to complete unit");
    }
  };

  const handleForceComplete = async (orderId: string) => {
    if (!confirm("Are you sure you want to force complete this order?")) return;
    try {
      await apiRequest(`/kitchen/orders/${orderId}/force-complete`, { method: "POST" });
      loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to force complete order");
    }
  };

  const cols = {
    NOT_STARTED: items.filter(i => i.prepState === "NOT_STARTED"),
    STARTED: items.filter(i => i.prepState === "STARTED"),
    DONE: items.filter(i => i.prepState === "DONE"),
  };

  const renderCard = (item: KitchenBoardItem) => (
    <div key={item.id} className="bg-white dark:bg-zinc-900 border p-4 rounded-lg shadow-sm space-y-3">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-xs text-muted-foreground font-mono">{item.orderNumber}</p>
          <p className="font-semibold">{item.quantity}x {item.dishNameSnapshot}</p>
        </div>
        <div className={`text-xs px-2 py-1 rounded-full font-medium
          ${item.timingState === 'ON_TRACK' ? 'bg-green-100 text-green-800' : ''}
          ${item.timingState === 'AT_RISK' ? 'bg-yellow-100 text-yellow-800' : ''}
          ${item.timingState === 'LATE' ? 'bg-red-100 text-red-800' : ''}
          ${item.timingState === 'COMPLETE' ? 'bg-gray-100 text-gray-800' : ''}
        `}>
          {item.timingState}
        </div>
      </div>
      
      <div className="text-sm text-muted-foreground">
        <p>{item.stationNameSnapshot || "Unassigned Station"}</p>
        <p>{new Date(item.plannedKitchenReadyAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
      </div>

      {item.options.length > 0 && (
        <ul className="text-xs text-zinc-500 list-disc list-inside">
          {item.options.map((opt, idx) => (
            <li key={idx}>{opt.optionNameSnapshot} {opt.portionNameSnapshot ? `(${opt.portionNameSnapshot})` : ''}</li>
          ))}
        </ul>
      )}

      <div className="flex gap-2 pt-2">
        {item.prepState === "NOT_STARTED" && hasUpdatePerm && (
          <Button size="sm" onClick={() => handleStart(item.id)} className="w-full">Start</Button>
        )}
        {item.prepState !== "DONE" && hasUpdatePerm && (
          <Button size="sm" onClick={() => handleDone(item.id)} variant={item.prepState === "NOT_STARTED" ? "outline" : "default"} className="w-full">Done</Button>
        )}
        {hasForceCompletePerm && item.prepState !== "DONE" && (
          <Button size="sm" variant="destructive" onClick={() => handleForceComplete(item.orderId)} className="w-full">Force</Button>
        )}
      </div>
    </div>
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Kitchen Board</h1>
        <div className="flex gap-4 items-center">
          <Input 
            type="date" 
            value={date} 
            onChange={e => setDate(e.target.value)} 
            className="w-40"
          />
          <Select value={stationId || ""} onValueChange={(val) => setStationId(val || "all")}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter Station" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stations</SelectItem>
              <SelectItem value="unassigned">Unassigned</SelectItem>
              {/* In a real app we would load active stations here */}
            </SelectContent>
          </Select>
          <Button onClick={loadData} variant="outline" disabled={isLoading}>
            {isLoading ? "..." : "Refresh"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* NOT STARTED */}
        <div className="space-y-4">
          <h2 className="font-semibold bg-gray-100 p-2 rounded text-center">To Do ({cols.NOT_STARTED.length})</h2>
          <div className="space-y-4">
            {cols.NOT_STARTED.map(renderCard)}
          </div>
        </div>

        {/* STARTED */}
        <div className="space-y-4">
          <h2 className="font-semibold bg-blue-100 text-blue-800 p-2 rounded text-center">In Progress ({cols.STARTED.length})</h2>
          <div className="space-y-4">
            {cols.STARTED.map(renderCard)}
          </div>
        </div>

        {/* DONE */}
        <div className="space-y-4">
          <h2 className="font-semibold bg-green-100 text-green-800 p-2 rounded text-center">Done ({cols.DONE.length})</h2>
          <div className="space-y-4">
            {cols.DONE.map(renderCard)}
          </div>
        </div>
      </div>
    </div>
  );
}
