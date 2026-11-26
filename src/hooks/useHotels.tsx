import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { mockStore } from "@/lib/mockStore";
import { toast } from "@/hooks/use-toast";

/** Read a hotel from the persisted store (not static seed data). */
export function useHotel(hotelId: string | null) {
  return useQuery({
    queryKey: ["hotel-info", hotelId],
    queryFn: async () => {
      if (!hotelId) return null;
      // Super-admins have hotelId 'global' until they pick a hotel, so
      // fall back to the first hotel rather than showing nothing.
      const found = await mockStore.hotels.getById(hotelId);
      if (found) return found;
      const all = await mockStore.hotels.getAll();
      return all[0] ?? null;
    },
    enabled: !!hotelId,
  });
}

/** Persist hotel branding changes through the store. */
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
      return mockStore.hotels.update(id, updates);
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
