import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { mockStore } from "@/lib/mockStore";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

export type RoomStatus = "available" | "occupied" | "dirty" | "cleaning" | "maintenance";
export type RoomType = "standard" | "deluxe" | "suite" | "penthouse";

export interface Room {
  id: string;
  number: string;
  type: RoomType;
  floor: number;
  status: RoomStatus;
  capacity: number;
  price_per_night?: number;
  rate?: number;
  amenities: string[];
  created_at: string;
  updated_at?: string;
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
    mutationFn: async (room: Omit<Room, "id" | "created_at" | "updated_at">) => {
      return await mockStore.rooms.create(room, hotelId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      toast({ title: "Room created successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error creating room", description: error.message, variant: "destructive" });
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
    onError: (error: any) => {
      toast({ title: "Error updating room", description: error.message, variant: "destructive" });
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
    onError: (error: any) => {
      toast({ title: "Error deleting room", description: error.message, variant: "destructive" });
    },
  });
}
