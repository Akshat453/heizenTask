"use client";

import { useQuery } from "@tanstack/react-query";
import { useSyncExternalStore } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { businessTimeApi } from "@/lib/api";

/** Shown only until the first /business-time/now response arrives. */
const DEFAULT_TIMEZONE = "Asia/Kolkata";

export type BusinessClock = {
  /** Backend business date (YYYY-MM-DD); null while loading. */
  businessDate: string | null;
  timeZone: string;
  /** Server-corrected "now" in epoch ms; re-renders every 30 s. */
  nowMs: number;
  offsetMs: number;
  isLoading: boolean;
};

type ClockData = { businessDate: string; timeZone: string; offsetMs: number };

export const businessClockKey = (userId: string | undefined) => ["business-clock", userId] as const;

// Shared 30-second ticker so every consumer re-renders together.
let tickNow = typeof window === "undefined" ? 0 : Date.now();
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | undefined;

function subscribe(listener: () => void) {
  if (!timer) {
    tickNow = Date.now();
    timer = setInterval(() => {
      tickNow = Date.now();
      listeners.forEach((notify) => notify());
    }, 30_000);
  }
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && timer) {
      clearInterval(timer);
      timer = undefined;
    }
  };
}

const getTick = () => tickNow;
const getServerTick = () => 0;

/**
 * Business date, timezone and a server-corrected clock for countdowns, from
 * GET /business-time/now (any signed-in role). "Today" always comes from the
 * backend, never from the browser's calendar.
 */
export function useBusinessClock(): BusinessClock {
  const { user } = useAuth();
  const query = useQuery({
    queryKey: businessClockKey(user?.id),
    enabled: Boolean(user),
    refetchInterval: 5 * 60_000,
    queryFn: async (): Promise<ClockData> => {
      const sentAt = Date.now();
      const clock = await businessTimeApi.now();
      const receivedAt = Date.now();
      const offset = new Date(clock.serverNow).getTime() - (sentAt + receivedAt) / 2;
      // Ignore sub-second skew; it is within network noise.
      return { businessDate: clock.businessDate, timeZone: clock.timezone, offsetMs: Math.abs(offset) > 1_000 ? Math.round(offset) : 0 };
    },
  });

  const tick = useSyncExternalStore(subscribe, getTick, getServerTick);
  const offsetMs = query.data?.offsetMs ?? 0;
  return {
    businessDate: query.data?.businessDate ?? null,
    timeZone: query.data?.timeZone ?? DEFAULT_TIMEZONE,
    nowMs: tick + offsetMs,
    offsetMs,
    isLoading: query.isLoading,
  };
}
