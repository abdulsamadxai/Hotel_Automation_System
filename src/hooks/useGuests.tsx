import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { mockStore, type GuestCreateInput } from "@/lib/mockStore";
import type { Guest as CanonicalGuest, GuestTag } from "@/lib/types";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

export type { GuestTag } from "@/lib/types";

export type Guest = CanonicalGuest;

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "An unknown error occurred";
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
    mutationFn: async (guest: GuestCreateInput) => {
      return await mockStore.guests.create(guest, hotelId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["guests"] });
      toast({ title: "Guest created successfully" });
    },
    onError: (error: unknown) => {
      toast({ title: "Error creating guest", description: toErrorMessage(error), variant: "destructive" });
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
    onError: (error: unknown) => {
      toast({ title: "Error updating guest", description: toErrorMessage(error), variant: "destructive" });
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
    onError: (error: unknown) => {
      toast({ title: "Error deleting guest", description: toErrorMessage(error), variant: "destructive" });
    },
  });
}
