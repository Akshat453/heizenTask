"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { FormErrorAlert } from "@/components/app/form-error-alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { pricingApi, type PriceTier, type PriceTierStrategy, type PriceTierWriteInput } from "@/lib/api";
import { CONFLICT_MESSAGE, describeError, isApiError } from "@/lib/api-client";
import { formatScaled, parseScaled } from "@/lib/decimal-input";
import { pricingKeys } from "./strategy";

type Props = { tier?: PriceTier; tiers: PriceTier[]; open: boolean; onOpenChange: (open: boolean) => void; onSaved?: (tier: PriceTier) => void };

/** Create a tier, or edit its name, strategy and source. Prices on derived tiers round up to 5 cents (server). */
export function TierDialog({ tier, tiers, open, onOpenChange, onSaved }: Props) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(tier?.name ?? "");
  const [strategy, setStrategy] = useState<PriceTierStrategy>(tier?.strategy ?? "MANUAL");
  const [multiplier, setMultiplier] = useState(tier?.costMultiplierBps ? formatScaled(tier.costMultiplierBps, 4) : "2");
  const [sourceTierId, setSourceTierId] = useState(tier?.sourceTierId ?? "");
  const [percent, setPercent] = useState(tier?.sourceAdjustmentBps != null ? formatScaled(tier.sourceAdjustmentBps, 2) : "10");
  const [isActive, setIsActive] = useState(tier?.isActive ?? true);
  const [problem, setProblem] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: (body: PriceTierWriteInput) => (tier ? pricingApi.updateTier(tier.id, body) : pricingApi.createTier(body)),
    onSuccess: (saved) => {
      toast.success(tier ? "Tier saved" : "Tier created");
      void queryClient.invalidateQueries({ queryKey: pricingKeys.all });
      onSaved?.(saved);
      onOpenChange(false);
    },
    onError: (e) => setProblem(isApiError(e, 409) ? `${CONFLICT_MESSAGE} ${e.message}` : describeError(e)),
  });

  const submit = () => {
    setProblem(null);
    const body: PriceTierWriteInput = { name: name.trim(), strategy, isActive, sourceTierId: null, costMultiplierBps: null, sourceAdjustmentBps: null };
    if (strategy === "COST_MULTIPLIER") {
      const bps = parseScaled(multiplier, 4);
      if (!Number.isInteger(bps) || bps < 1) return setProblem("Enter a multiplier like 2.4 (up to 4 decimals).");
      body.costMultiplierBps = bps;
    }
    if (strategy === "TIER_PERCENTAGE") {
      const bps = parseScaled(percent, 2);
      if (!sourceTierId) return setProblem("Choose the tier these prices are based on.");
      if (!Number.isInteger(bps)) return setProblem("Enter a percentage like 15 or -5 (up to 2 decimals).");
      body.sourceTierId = sourceTierId;
      body.sourceAdjustmentBps = bps;
    }
    save.mutate(body);
  };

  const sources = tiers.filter((t) => t.id !== tier?.id);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="shadow-soft sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{tier ? `Edit ${tier.name}` : "New price tier"}</DialogTitle>
          <DialogDescription>Derived prices round up to the next 5 cents. Changes apply to new orders only.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="t-name">Name</Label>
            <Input id="t-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <RadioGroup value={strategy} onValueChange={(v) => setStrategy(v as PriceTierStrategy)} className="flex flex-col gap-2">
            {([
              ["MANUAL", "Manual", "Every price is typed in the tier editor."],
              ["COST_MULTIPLIER", "Cost multiplier", "Price = cost × multiplier, unless overridden."],
              ["TIER_PERCENTAGE", "Based on another tier", "Price = that tier's price ± a percentage, unless overridden."],
            ] as const).map(([value, label, help]) => (
              <label key={value} className="flex items-start gap-2 rounded-md border p-2.5 text-sm has-data-checked:border-primary">
                <RadioGroupItem value={value} className="mt-0.5" />
                <span>
                  <span className="font-medium">{label}</span>
                  <span className="block text-xs text-muted-foreground">{help}</span>
                </span>
              </label>
            ))}
          </RadioGroup>
          {strategy === "COST_MULTIPLIER" && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="t-mult">Multiplier</Label>
              <Input id="t-mult" className="num w-32" inputMode="decimal" value={multiplier} onChange={(e) => setMultiplier(e.target.value)} />
            </div>
          )}
          {strategy === "TIER_PERCENTAGE" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="t-source">Base tier</Label>
                <Select value={sourceTierId} onValueChange={(v) => setSourceTierId(String(v ?? ""))}>
                  <SelectTrigger id="t-source" className="w-full">
                    <SelectValue placeholder="Choose a tier">{(v: string) => sources.find((t) => t.id === v)?.name ?? "Choose a tier"}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {sources.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.name}{!t.isActive && " (inactive)"}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="t-pct">Adjustment (%)</Label>
                <Input id="t-pct" className="num" inputMode="decimal" value={percent} onChange={(e) => setPercent(e.target.value)} />
              </div>
            </div>
          )}
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={isActive} onCheckedChange={setIsActive} /> Active
          </label>
          {problem && <FormErrorAlert messages={[problem]} />}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button disabled={!name.trim() || save.isPending} onClick={submit}>{save.isPending ? "Saving…" : tier ? "Save tier" : "Create tier"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
