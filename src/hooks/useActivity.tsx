import { useQuery, useMutation } from "@tanstack/react-query";
import { mockStore } from "@/lib/mockStore";
import { useQueryClient } from "@tanstack/react-query";

export type ActivityType = "booking" | "task" | "alert" | "automation" | "room";

export interface Activity {
  id: string;
  event_type?: ActivityType;
  event_name?: string;
  action?: string;
  entity_type?: string;
  entity_id?: string;
  title?: string;
  description?: string | null;
  details?: string;
  metadata?: Record<string, unknown>;
  source?: string;
  user_id?: string | null;
  user_name?: string;
  created_at: string;
}

import { useAuth } from "@/hooks/useAuth";

export function useActivity(limit: number = 10) {
  const { hotelId } = useAuth();

  return useQuery({
    queryKey: ["activity", hotelId, limit],
    queryFn: async () => {
      if (!hotelId) return [];
      const logs = await mockStore.activity.getAll(hotelId);
      return logs.slice(0, limit);
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
      // Mock delete - activity logs are typically append-only so this is optional
      // For now we'll just skip deleting
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activity"] });
    },
  });
}
