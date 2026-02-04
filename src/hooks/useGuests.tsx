import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { mockStore } from "@/lib/mockStore";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

export type GuestTag = "vip" | "regular" | "blocked";

export interface Guest {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  nationality?: string | null;
  id_number?: string | null;
  notes: string | null;
  tags: GuestTag[];
  total_stays: number;
  total_spent: number;
  last_stay_at?: string | null;
  created_at: string;
}

export function useGuests() {
  const { hotelId } = useAuth();

  return useQuery({
    queryKey: ["guests", hotelId],
    queryFn: async () => {
      if (!hotelId) return [];
      return await mockStore.guests.getAll(hotelId);
    },
    enabled: !!hotelId,
  });
}

export function useCreateGuest() {
  const queryClient = useQueryClient();
  const { hotelId } = useAuth();

  return useMutation({
    mutationFn: async (guest: Omit<Guest, "id" | "created_at" | "updated_at" | "total_stays" | "total_spent" | "last_stay_at">) => {
      return await mockStore.guests.create(guest, hotelId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["guests"] });
      toast({ title: "Guest created successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error creating guest", description: error.message, variant: "destructive" });
    },
  });
}

export function useUpdateGuest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Guest> & { id: string }) => {
      return await mockStore.guests.update(id, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["guests"] });
      toast({ title: "Guest updated successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error updating guest", description: error.message, variant: "destructive" });
    },
  });
}

export function useDeleteGuest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await mockStore.guests.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["guests"] });
      toast({ title: "Guest deleted successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error deleting guest", description: error.message, variant: "destructive" });
    },
  });
}
