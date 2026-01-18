import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export type GuestTag = "vip" | "regular" | "blocked";

export interface Guest {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  tags: GuestTag[];
  total_stays: number;
  total_spent: number;
  last_stay_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export function useGuests() {
  return useQuery({
    queryKey: ["guests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("guests")
        .select("*")
        .order("name");

      if (error) throw error;

      // Map and provide defaults for missing columns to prevent crashes
      return (data || []).map((guest: any) => ({
        ...guest,
        total_stays: guest.total_stays || 0,
        total_spent: guest.total_spent || 0,
        last_stay_at: guest.last_stay_at || null,
        tags: guest.tags || [], // Ensure tags is array
      })) as Guest[];
    },
  });
}

export function useCreateGuest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (guest: Omit<Guest, "id" | "created_at" | "updated_at" | "total_stays" | "total_spent" | "last_stay_at">) => {
      const { data, error } = await supabase
        .from("guests")
        .insert(guest)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["guests"] });
      toast({ title: "Guest created successfully" });
    },
    onError: (error) => {
      toast({ title: "Error creating guest", description: error.message, variant: "destructive" });
    },
  });
}

export function useUpdateGuest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Guest> & { id: string }) => {
      const { data, error } = await supabase
        .from("guests")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["guests"] });
      toast({ title: "Guest updated successfully" });
    },
    onError: (error) => {
      toast({ title: "Error updating guest", description: error.message, variant: "destructive" });
    },
  });
}

export function useDeleteGuest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("guests")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["guests"] });
      toast({ title: "Guest deleted successfully" });
    },
    onError: (error) => {
      toast({ title: "Error deleting guest", description: error.message, variant: "destructive" });
    },
  });
}
