"use client";

import { ArrowDown, ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Keyboard-accessible reordering (no drag library). */
export function ReorderButtons({ label, index, count, onMove, disabled }: { label: string; index: number; count: number; onMove: (to: number) => void; disabled?: boolean }) {
  return (
    <span className="inline-flex">
      <Button type="button" variant="ghost" size="icon-sm" aria-label={`Move ${label} up`} disabled={disabled || index === 0} onClick={() => onMove(index - 1)}>
        <ArrowUp />
      </Button>
      <Button type="button" variant="ghost" size="icon-sm" aria-label={`Move ${label} down`} disabled={disabled || index === count - 1} onClick={() => onMove(index + 1)}>
        <ArrowDown />
      </Button>
    </span>
  );
}

export function move<T>(list: T[], from: number, to: number): T[] {
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}
