import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, hotelParams } from "@/lib/api";
import type {
  BookingCreateInput,
  BookingStatus,
  BookingWithJoins,
} from "@/lib/types";
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
      return await api.get<Booking[]>("/api/bookings", hotelParams(hotelId));
    },
    enabled: !!hotelId,
  });
}

export function useCreateBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (booking: BookingCreateInput) => {
      // The server computes nights and total_amount from the room's
      // price_per_night; the response is the truth.
      return await api.post<Booking>("/api/bookings", booking);
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
      // Check-in / check-out / cancel have dedicated endpoints with their
      // side effects (room status, final invoice, cleaning task). A plain
      // status change (pending / confirmed) goes through PATCH.
      if (status === "checked_in") {
        return await api.post<Booking>(`/api/bookings/${id}/check-in`);
      }
      if (status === "checked_out") {
        return await api.post<Booking>(`/api/bookings/${id}/check-out`);
      }
      if (status === "cancelled") {
        return await api.post<Booking>(`/api/bookings/${id}/cancel`);
      }
      return await api.patch<Booking>(`/api/bookings/${id}`, { status });
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
    mutationFn: async ({ id, ...updates }: Partial<Omit<Booking, "id" | "hotel_id" | "booking_number" | "guest" | "room">> & { id: string }) => {
      // The server recomputes nights / total_amount when the dates or room
      // change — never send client-computed totals.
      const { nights: _nights, total_amount: _total, ...rest } = updates;
      return await api.patch<Booking>(`/api/bookings/${id}`, rest);
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
      await api.del(`/api/bookings/${id}`);
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
