"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { FormErrorAlert } from "@/components/app/form-error-alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useBusinessClock } from "@/hooks/use-business-clock";
import { ordersApi, referenceDataApi, type CompanyDetail, type OrderDetail, type OverrideDeliveryInput } from "@/lib/api";
import { isApiError } from "@/lib/api-client";
import { businessWallTimeToIso, formatBusinessTime, toIsoDate } from "@/lib/format";
import { useOrderMutation } from "./use-order-mutation";

type Props = { order: OrderDetail; company: CompanyDetail | undefined; open: boolean; onOpenChange: (open: boolean) => void };

/** Admin override of address, time and packaging (PLACED or CONFIRMED orders, before departure). */
export function OverrideDeliveryDialog({ order, company, open, onOpenChange }: Props) {
  const { timeZone } = useBusinessClock();
  const currentTime = formatBusinessTime(order.deliveryAt, timeZone);
  const [addressId, setAddressId] = useState(order.deliveryAddressId ?? "");
  const [time, setTime] = useState(currentTime);
  const [packagingId, setPackagingId] = useState(order.packagingTypeId);
  const packagings = useQuery({ queryKey: ["reference", "packaging"], queryFn: referenceDataApi.packagingTypes, enabled: open, staleTime: 5 * 60_000 });
  const addresses = (company?.addresses ?? []).filter((a) => a.isActive);
  const activePackagings = (packagings.data ?? []).filter((p) => p.isActive);

  const save = useOrderMutation(order.id, (body: OverrideDeliveryInput) => ordersApi.overrideDelivery(order.id, body), "Delivery details changed", {
    inline: true,
    onDone: () => onOpenChange(false),
  });

  const body: OverrideDeliveryInput = {
    ...(addressId && addressId !== order.deliveryAddressId && { deliveryAddressId: addressId }),
    ...(time && time !== currentTime && { deliveryAt: businessWallTimeToIso(toIsoDate(order.deliveryDate), time, timeZone) }),
    ...(packagingId !== order.packagingTypeId && { packagingTypeId: packagingId }),
  };
  const changed = Object.keys(body).length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="shadow-soft sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Change delivery details</DialogTitle>
          <DialogDescription>This can move the order to a different drop and changes its kitchen deadlines.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="override-address">Address</Label>
            <Select value={addressId} onValueChange={(v) => setAddressId(String(v ?? ""))}>
              <SelectTrigger id="override-address" className="w-full">
                <SelectValue>{(v: string) => addresses.find((a) => a.id === v)?.label ?? order.deliveryAddressLabelSnapshot}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {addresses.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.label} <span className="text-xs text-muted-foreground">{a.line1}, {a.city}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Only the company&apos;s active addresses are listed.</p>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="override-time">Delivery time ({timeZone})</Label>
            <Input id="override-time" type="time" step={300} value={time} onChange={(e) => setTime(e.target.value)} className="num w-36" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="override-packaging">Packaging</Label>
            <Select value={packagingId} onValueChange={(v) => setPackagingId(String(v ?? order.packagingTypeId))}>
              <SelectTrigger id="override-packaging" className="w-full">
                <SelectValue>{(v: string) => activePackagings.find((p) => p.id === v)?.name ?? order.packagingNameSnapshot}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {activePackagings.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {save.error && isApiError(save.error, 400) && <FormErrorAlert messages={save.error.messages} />}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={!changed || save.isPending} onClick={() => save.mutate(body)}>
            {save.isPending ? "Saving…" : "Save delivery details"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
