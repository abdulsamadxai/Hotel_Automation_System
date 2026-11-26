import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { mockStore, type RoomCreateInput } from "@/lib/mockStore";
import type { Room as CanonicalRoom, RoomStatus, RoomType } from "@/lib/types";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

export type { RoomStatus, RoomType } from "@/lib/types";

/** Canonical room: nightly price is `price_per_night` only (no `rate`). */
export type Room = CanonicalRoom;

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "An unknown error occurred";
}

export function useRooms() {
  const { hotelId } = useAuth();

  return useQuery({
    queryKey: ["rooms", hotelId],
    queryFn: async () => {
      if (!hotelId) return [];
      return await mockStore.rooms.getAll(hotelId);
    },
    enabled: !!hotelId,
  });
}

export function useRoom(id: string) {
  const { hotelId } = useAuth();

  return useQuery({
    queryKey: ["rooms", id],
    queryFn: async () => {
      if (!hotelId) return null;
      const rooms = await mockStore.rooms.getAll(hotelId);
      return rooms.find(r => r.id === id) || null;
    },
    enabled: !!id,
  });
}

export function useCreateRoom() {
  const queryClient = useQueryClient();
  const { hotelId } = useAuth();

  return useMutation({
    mutationFn: async (room: RoomCreateInput) => {
      return await mockStore.rooms.create(room, hotelId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      toast({ title: "Room created successfully" });
    },
    onError: (error: unknown) => {
      toast({ title: "Error creating room", description: toErrorMessage(error), variant: "destructive" });
    },
  });
}

export function useUpdateRoom() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Room> & { id: string }) => {
      return await mockStore.rooms.update(id, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      toast({ title: "Room updated successfully" });
    },
    onError: (error: unknown) => {
      toast({ title: "Error updating room", description: toErrorMessage(error), variant: "destructive" });
    },
  });
}

export function useDeleteRoom() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await mockStore.rooms.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      toast({ title: "Room deleted successfully" });
    },
    onError: (error: unknown) => {
      toast({ title: "Error deleting room", description: toErrorMessage(error), variant: "destructive" });
    },
  });
}
