import { useQuery, useMutation } from "@tanstack/react-query";
import { mockStore } from "@/lib/mockStore";
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
      const logs = await mockStore.activity.getAll(hotelId);
      // Newest first (the store already sorts; sort defensively) then limit.
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
  // Mock implementation - no realtime in frontend-only
}

export function useRealtimeRooms() {
  // Mock implementation - no realtime in frontend-only
}

export function useRealtimeBookings() {
  // Mock implementation - no realtime in frontend-only
}

export function useRealtimeHousekeeping() {
  // Mock implementation - no realtime in frontend-only
}

export function useDeleteActivity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await mockStore.activity.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activity"] });
    },
    onError: (error: unknown) => {
      console.error("Error deleting activity log:", toErrorMessage(error));
    },
  });
}
