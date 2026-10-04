"use client";

import { useQuery } from "@tanstack/react-query";
import { driverApi } from "@/lib/api";

export const driverKeys = { today: ["driver", "today"] as const };

/** The signed-in driver's drops for the business day (identity comes from the cookie). */
export const useDriverToday = () =>
  useQuery({ queryKey: driverKeys.today, queryFn: driverApi.today, refetchInterval: 30_000, refetchOnWindowFocus: true });
