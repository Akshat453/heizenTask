import { useQuery } from "@tanstack/react-query";
import { dashboardApi, dispatchApi, kitchenApi } from "@/lib/api";

/** Dashboards are live: refetch every 60 s and on window focus. */
export const DASHBOARD_REFRESH_MS = 60_000;

export const dashboardKeys = {
  all: ["dashboard"] as const,
  admin: () => [...dashboardKeys.all, "admin"] as const,
  kitchen: () => [...dashboardKeys.all, "kitchen"] as const,
  dispatch: () => [...dashboardKeys.all, "dispatch"] as const,
  driver: () => [...dashboardKeys.all, "driver"] as const,
  kitchenBoard: (date: string) => [...dashboardKeys.all, "kitchen-board", date] as const,
  drops: (date: string) => [...dashboardKeys.all, "drops", date] as const,
};

const live = { refetchInterval: DASHBOARD_REFRESH_MS } as const;

export const useAdminDashboard = () => useQuery({ queryKey: dashboardKeys.admin(), queryFn: dashboardApi.admin, ...live });
export const useKitchenDashboard = (enabled = true) =>
  useQuery({ queryKey: dashboardKeys.kitchen(), queryFn: dashboardApi.kitchen, enabled, ...live });
export const useDispatchDashboard = (enabled = true) =>
  useQuery({ queryKey: dashboardKeys.dispatch(), queryFn: dashboardApi.dispatch, enabled, ...live });
export const useDriverDashboard = () => useQuery({ queryKey: dashboardKeys.driver(), queryFn: dashboardApi.driver, ...live });

/** Today's kitchen board rows (unpaginated). */
export const useTodayKitchenBoard = (date: string | undefined) =>
  useQuery({
    queryKey: dashboardKeys.kitchenBoard(date ?? ""),
    queryFn: () => kitchenApi.board(date!),
    enabled: Boolean(date),
    ...live,
  });

/** Today's drops (first 100, ordered by scheduled time). */
export const useTodayDrops = (date: string | undefined, enabled = true) =>
  useQuery({
    queryKey: dashboardKeys.drops(date ?? ""),
    queryFn: () => dispatchApi.list(date!),
    enabled: enabled && Boolean(date),
    ...live,
  });
