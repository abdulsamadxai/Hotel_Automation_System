import { useQuery } from "@tanstack/react-query";
import { api, hotelParams } from "@/lib/api";
import type { DashboardSummary } from "@/lib/types";
import { useAuth } from "@/hooks/useAuth";

/**
 * GET /api/dashboard/summary — the single source for the dashboard's KPIs,
 * today's arrivals / departures, the housekeeping queue and the occupancy /
 * revenue trend arrays. The server anchors "today" to the latest date in
 * the records (capped at now) and returns `anchor_date` so the UI can say
 * when the data is stale instead of plotting an empty range.
 */
export function useDashboardSummary() {
  const { hotelId } = useAuth();

  return useQuery({
    queryKey: ["dashboard-summary", hotelId],
    queryFn: async () => {
      if (!hotelId) return null;
      return await api.get<DashboardSummary>(
        "/api/dashboard/summary",
        hotelParams(hotelId),
      );
    },
    enabled: !!hotelId,
  });
}
