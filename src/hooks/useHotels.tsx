import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Hotel } from "@/lib/types";
import { toast } from "@/hooks/use-toast";

/** All hotels (super-admin sees every hotel; everyone else their own). */
export function useHotels() {
  return useQuery({
    queryKey: ["hotels"],
    queryFn: async () => await api.get<Hotel[]>("/api/hotels"),
  });
}

/** Read a hotel from the API. */
export function useHotel(hotelId: string | null) {
  return useQuery({
    queryKey: ["hotel-info", hotelId],
    queryFn: async () => {
      if (!hotelId) return null;
      // Super-admins have hotelId 'global' until they pick a hotel, so
      // fall back to the first hotel rather than showing nothing.
      try {
        return await api.get<Hotel>(`/api/hotels/${hotelId}`);
      } catch {
        const all = await api.get<Hotel[]>("/api/hotels");
        return all[0] ?? null;
      }
    },
    enabled: !!hotelId,
  });
}

/** Persist hotel branding changes through the API. */
export function useUpdateHotel(hotelId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: { name: string; location: string; logo_url: string };
    }) => {
      return api.patch<Hotel>(`/api/hotels/${id}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hotel-info", hotelId] });
      // HotelCodeDisplay reads the same hotel under a different key.
      queryClient.invalidateQueries({ queryKey: ["hotel-details", hotelId] });
      toast({ title: "Settings updated", description: "Your hotel branding has been updated successfully." });
    },
    onError: (error: unknown) => {
      toast({
        title: "Update failed",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    },
  });
}
