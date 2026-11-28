import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, hotelParams, writeHotelParams } from "@/lib/api";
import type { Guest as CanonicalGuest, GuestCreateInput, GuestTag } from "@/lib/types";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

export type { GuestTag } from "@/lib/types";

export type Guest = CanonicalGuest;

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "An unknown error occurred";
}

/**
 * Guests for the hotel, optionally filtered server-side with `?q=`
 * (name / email / phone; case-insensitive on PostgreSQL, case-sensitive
 * on the dev-only SQLite build).
 */
export function useGuests(search?: string) {
  const { hotelId } = useAuth();
  const q = search?.trim() ? search.trim() : undefined;

  return useQuery({
    queryKey: ["guests", hotelId, q ?? ""],
    queryFn: async () => {
      if (!hotelId) return [];
      return await api.get<Guest[]>("/api/guests", { ...hotelParams(hotelId), q });
    },
    enabled: !!hotelId,
  });
}

export function useCreateGuest() {
  const queryClient = useQueryClient();
  const { role, hotelId } = useAuth();

  return useMutation({
    mutationFn: async (guest: GuestCreateInput) => {
      return await api.post<Guest>("/api/guests", {
        ...guest,
        ...writeHotelParams(role, hotelId),
      });
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
      return await api.patch<Guest>(`/api/guests/${id}`, updates);
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
      await api.del(`/api/guests/${id}`);
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
