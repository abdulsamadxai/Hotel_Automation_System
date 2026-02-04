import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { mockStore } from "@/lib/mockStore";
import { useAuth } from "./useAuth";

export type NotificationType = "booking" | "task" | "alert" | "automation" | "room" | "info" | "warning" | "success";

export interface Notification {
  id: string;
  user_id?: string | null;
  hotel_id?: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string | null;
  is_read?: boolean;
  read?: boolean;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export function useNotifications() {
  const { user, hotelId } = useAuth();

  return useQuery({
    queryKey: ["notifications", user?.id, hotelId],
    queryFn: async () => {
      if (!hotelId) return [];
      const notifications = await mockStore.notifications.getAll(hotelId);
      // Filter by user if needed (or return all for the hotel)
      return notifications.slice(0, 50); // Limit to 50
    },
    enabled: !!hotelId,
  });
}

export function useUnreadCount() {
  const { data: notifications } = useNotifications();
  return notifications?.filter((n) => !(n.is_read || n.read)).length || 0;
}

export function useMarkAsRead() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      await mockStore.notifications.update(id, { is_read: true, read: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", user?.id] });
    },
  });
}

export function useMarkAllAsRead() {
  const queryClient = useQueryClient();
  const { user, hotelId } = useAuth();

  return useMutation({
    mutationFn: async () => {
      if (!hotelId) return;
      const notifications = await mockStore.notifications.getAll(hotelId);
      const unread = notifications.filter(n => !(n.is_read || n.read));
      for (const notif of unread) {
        await mockStore.notifications.update(notif.id, { is_read: true, read: true });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", user?.id] });
    },
  });
}

export function useRealtimeNotifications() {
  // Mock implementation - no realtime in frontend-only
  // This hook can remain but does nothing
}
