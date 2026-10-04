"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { DispatchDrop, DriverOption } from "@/lib/api";

type Props = {
  drop: DispatchDrop;
  drivers: DriverOption[];
  /** The company's default driver (tagged "Default"). */
  defaultDriverId: string | null;
  canAssign: boolean;
  pending: boolean;
  onAssign: (driverId: string) => void;
};

/** Assigns on change. Only ready-to-leave drops can change driver (server rule). */
export function DriverSelect({ drop, drivers, defaultDriverId, canAssign, pending, onAssign }: Props) {
  const editable = canAssign && drop.status === "DISPATCH_READY";
  if (!editable)
    return <span className="text-sm">{drop.driver?.name ?? <span className="text-muted-foreground">No driver</span>}</span>;
  return (
    <Select value={drop.driverStaffUserId ?? ""} disabled={pending} onValueChange={(v) => v && v !== drop.driverStaffUserId && onAssign(String(v))}>
      <SelectTrigger aria-label="Driver" className="h-11 w-full" onClick={(e) => e.stopPropagation()}>
        <SelectValue placeholder="Assign a driver">
          {(v: string) => drivers.find((d) => d.id === v)?.name ?? drop.driver?.name ?? "Assign a driver"}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {drivers.map((driver) => (
          <SelectItem key={driver.id} value={driver.id}>
            {driver.name}
            {driver.id === defaultDriverId && (
              <span className="rounded border bg-secondary px-1 text-[11px] text-secondary-foreground">Default</span>
            )}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
