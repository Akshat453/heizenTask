"use client";

import { useSyncExternalStore } from "react";

/** Epoch ms that re-renders every `intervalMs` (for "Updated 20 s ago" labels). */
export function useNow(intervalMs = 5_000): number {
  return useSyncExternalStore(
    (notify) => {
      const id = setInterval(notify, intervalMs);
      return () => clearInterval(id);
    },
    () => Math.floor(Date.now() / intervalMs) * intervalMs,
    () => 0,
  );
}
