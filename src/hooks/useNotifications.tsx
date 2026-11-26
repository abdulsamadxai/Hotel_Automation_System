import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, hotelParams } from "@/lib/api";
import type { Notification as CanonicalNotification, NotificationType } from "@/lib/types";
import { useAuth } from "./useAuth";

export type { NotificationType } from "@/lib/types";

/** Canonical notification: `is_read` only (no `read` dual-write). */
export type Notification = CanonicalNotification;

export function useNotifications() {
  const { user, hotelId } = useAuth();

  return useQuery({
    queryKey: ["notifications", user?.id, hotelId],
    queryFn: async () => {
      if (!hotelId) return [];
      const notifications = await api.get<Notification[]>("/api/notifications", hotelParams(hotelId));
      // Filter by user if needed (or return all for the hotel)
      return notifications.slice(0, 50); // Limit to 50
    },
    enabled: !!hotelId,
  });
}

export function useUnreadCount() {
  const { data: notifications } = useNotifications();
  return notifications?.filter((n) => !n.is_read).length || 0;
}

export function useMarkAsRead() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.patch(`/api/notifications/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", user?.id] });
    },
  });
}

export function useDeleteNotification() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.del(`/api/notifications/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", user?.id] });
    },
  });
}

export function useMarkAllAsRead() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async () => {
      await api.post("/api/notifications/read-all");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", user?.id] });
    },
  });
}

export function useRealtimeNotifications() {
  // No realtime channel — the list refreshes on navigation and on
  // invalidation after mutations. This hook stays as a no-op so existing
  // call sites keep compiling.
}
