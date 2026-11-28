import { useQuery, useMutation } from "@tanstack/react-query";
import { api, hotelParams } from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";
import type { ActivityLog as CanonicalActivityLog } from "@/lib/types";
import { useAuth } from "@/hooks/useAuth";

export type ActivityType = "booking" | "task" | "alert" | "automation" | "room";

/** Canonical activity log: `action`, `details`, `entity_type`, `created_at`. */
export type Activity = CanonicalActivityLog;

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "An unknown error occurred";
}

export function useActivity(limit: number = 10) {
  const { hotelId } = useAuth();

  return useQuery({
    queryKey: ["activity", hotelId, limit],
    queryFn: async () => {
      if (!hotelId) return [];
      const logs = await api.get<Activity[]>(
        "/api/activity",
        { ...hotelParams(hotelId), limit: String(limit) },
      );
      // Newest first (the server already sorts; sort defensively) then limit.
      const sorted = [...logs].sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
      return sorted.slice(0, limit);
    },
    enabled: !!hotelId,
  });
}

export function useRealtimeActivity() {
  // No realtime channel — activity refreshes on navigation and on
  // invalidation after mutations. Kept as a no-op for existing call sites.
}

export function useRealtimeRooms() {
  // No realtime channel — see useRealtimeActivity.
}

export function useRealtimeBookings() {
  // No realtime channel — see useRealtimeActivity.
}

export function useRealtimeHousekeeping() {
  // No realtime channel — see useRealtimeActivity.
}

export function useDeleteActivity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.del(`/api/activity/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activity"] });
    },
    onError: (error: unknown) => {
      console.error("Error deleting activity log:", toErrorMessage(error));
    },
  });
}
