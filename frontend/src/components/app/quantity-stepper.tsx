"use client";

import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Props = { value: number; onChange: (value: number) => void; min?: number; max?: number; label: string; disabled?: boolean };

/** Integer stepper: −, a typed number, +. */
export function QuantityStepper({ value, onChange, min = 0, max = 9999, label, disabled }: Props) {
  const set = (next: number) => onChange(Math.min(max, Math.max(min, Number.isFinite(next) ? Math.trunc(next) : min)));
  return (
    <div className="inline-flex items-center gap-1" role="group" aria-label={label}>
      <Button type="button" variant="outline" size="icon-sm" aria-label={`Decrease ${label}`} disabled={disabled || value <= min} onClick={() => set(value - 1)}>
        <Minus />
      </Button>
      <Input
        type="number"
        inputMode="numeric"
        aria-label={label}
        value={value}
        min={min}
        max={max}
        disabled={disabled}
        onChange={(e) => set(Number(e.target.value))}
        className="num h-7 w-14 text-center [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
      />
      <Button type="button" variant="outline" size="icon-sm" aria-label={`Increase ${label}`} disabled={disabled || value >= max} onClick={() => set(value + 1)}>
        <Plus />
      </Button>
    </div>
  );
}
