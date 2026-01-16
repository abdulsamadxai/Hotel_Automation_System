import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export type RoomStatus = "available" | "occupied" | "dirty" | "cleaning" | "maintenance";
export type RoomType = "standard" | "deluxe" | "suite" | "penthouse";

export interface Room {
  id: string;
  number: string;
  type: RoomType;
  floor: number;
  status: RoomStatus;
  capacity: number;
  rate: number;
  amenities: string[];
  created_at: string;
  updated_at: string;
}

export function useRooms() {
  return useQuery({
    queryKey: ["rooms"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rooms")
        .select("*")
        .order("number");
      
      if (error) throw error;
      return data as Room[];
    },
  });
}

export function useRoom(id: string) {
  return useQuery({
    queryKey: ["rooms", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rooms")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      
      if (error) throw error;
      return data as Room | null;
    },
    enabled: !!id,
  });
}

export function useCreateRoom() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (room: Omit<Room, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase
        .from("rooms")
        .insert(room)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      toast({ title: "Room created successfully" });
    },
    onError: (error) => {
      toast({ title: "Error creating room", description: error.message, variant: "destructive" });
    },
  });
}

export function useUpdateRoom() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Room> & { id: string }) => {
      const { data, error } = await supabase
        .from("rooms")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      toast({ title: "Room updated successfully" });
    },
    onError: (error) => {
      toast({ title: "Error updating room", description: error.message, variant: "destructive" });
    },
  });
}

export function useDeleteRoom() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("rooms")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      toast({ title: "Room deleted successfully" });
    },
    onError: (error) => {
      toast({ title: "Error deleting room", description: error.message, variant: "destructive" });
    },
  });
}
