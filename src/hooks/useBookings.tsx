import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { mockStore } from "@/lib/mockStore";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

export type BookingStatus = "pending" | "confirmed" | "checked_in" | "checked_out" | "cancelled";

export interface Booking {
  id: string;
  booking_number: string;
  guest_id: string | null;
  room_id: string | null;
  guest_type: "national" | "international";
  check_in: string;
  check_out: string;
  status: BookingStatus;
  nights: number;
  total_amount: number;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  guest?: { id: string; name: string; email: string | null; tags: string[] } | null;
  room?: { id: string; number: string; type: string } | null;
  payment_status?: "pending" | "partially_paid" | "paid" | "refunded";
  deposit_amount?: number;
}

export function useBookings() {
  const { hotelId } = useAuth();

  return useQuery({
    queryKey: ["bookings", hotelId],
    queryFn: async () => {
      if (!hotelId) return [];
      return await mockStore.bookings.getAll(hotelId);
    },
    enabled: !!hotelId,
  });
}

export function useCreateBooking() {
  const queryClient = useQueryClient();
  const { hotelId } = useAuth();

  return useMutation({
    mutationFn: async (booking: {
      guest_id: string;
      room_id: string;
      guest_type: "national" | "international";
      check_in: string;
      check_out: string;
      total_amount: number;
      notes?: string;
      status?: BookingStatus;
      payment_status?: string;
      deposit_amount?: number;
    }) => {
      return await mockStore.bookings.create(booking, hotelId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      queryClient.invalidateQueries({ queryKey: ["activity"] });
      toast({ title: "Booking created successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error creating booking", description: error.message, variant: "destructive" });
    },
  });
}

export function useUpdateBookingStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: BookingStatus }) => {
      return await mockStore.bookings.update(id, { status });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      queryClient.invalidateQueries({ queryKey: ["housekeeping"] });
      queryClient.invalidateQueries({ queryKey: ["activity"] });

      const statusMessages: Record<BookingStatus, string> = {
        pending: "Booking set to pending",
        confirmed: "Booking confirmed",
        checked_in: "Guest checked in successfully",
        checked_out: "Guest checked out - housekeeping task created",
        cancelled: "Booking cancelled",
      };

      toast({ title: statusMessages[data.status as BookingStatus] });
    },
    onError: (error: any) => {
      toast({ title: "Error updating booking", description: error.message, variant: "destructive" });
    },
  });
}

export function useUpdateBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string;[key: string]: any }) => {
      return await mockStore.bookings.update(id, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      queryClient.invalidateQueries({ queryKey: ["activity"] });
      toast({ title: "Booking updated successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error updating booking", description: error.message, variant: "destructive" });
    },
  });
}

export function useDeleteBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await mockStore.bookings.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      toast({ title: "Booking deleted successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error deleting booking", description: error.message, variant: "destructive" });
    },
  });
}
