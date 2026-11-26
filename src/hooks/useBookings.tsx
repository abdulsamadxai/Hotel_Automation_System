import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { mockStore, type BookingCreateInput, type BookingWithJoins } from "@/lib/mockStore";
import type { BookingStatus } from "@/lib/types";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

export type { BookingStatus } from "@/lib/types";

/** A booking with its joined guest and room. */
export type Booking = BookingWithJoins;

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "An unknown error occurred";
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
    mutationFn: async (booking: BookingCreateInput) => {
      return await mockStore.bookings.create(booking, hotelId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      queryClient.invalidateQueries({ queryKey: ["activity"] });
      toast({ title: "Booking created successfully" });
    },
    onError: (error: unknown) => {
      toast({ title: "Error creating booking", description: toErrorMessage(error), variant: "destructive" });
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
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["guests"] });
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
    onError: (error: unknown) => {
      toast({ title: "Error updating booking", description: toErrorMessage(error), variant: "destructive" });
    },
  });
}

export function useUpdateBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Omit<Booking, "id" | "hotel_id" | "booking_number">> & { id: string }) => {
      return await mockStore.bookings.update(id, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      queryClient.invalidateQueries({ queryKey: ["activity"] });
      toast({ title: "Booking updated successfully" });
    },
    onError: (error: unknown) => {
      toast({ title: "Error updating booking", description: toErrorMessage(error), variant: "destructive" });
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
    onError: (error: unknown) => {
      toast({ title: "Error deleting booking", description: toErrorMessage(error), variant: "destructive" });
    },
  });
}
