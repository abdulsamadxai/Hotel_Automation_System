import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

export type ActivityType = "booking" | "task" | "alert" | "automation" | "room";

export interface Activity {
  id: string;
  event_type: ActivityType;
  event_name: string;
  title: string;
  description: string | null;
  metadata: Record<string, unknown>;
  source: string;
  user_id: string | null;
  created_at: string;
}

export function useActivity(limit: number = 10) {
  return useQuery({
    queryKey: ["activity", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activity_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      return data as Activity[];
    },
  });
}

export function useRealtimeActivity() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel("activity-changes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "activity_log",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["activity"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}

export function useRealtimeRooms() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel("rooms-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "rooms",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["rooms"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}

export function useRealtimeBookings() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel("bookings-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bookings",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["bookings"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}

export function useRealtimeHousekeeping() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel("housekeeping-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "housekeeping_tasks",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["housekeeping"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}
