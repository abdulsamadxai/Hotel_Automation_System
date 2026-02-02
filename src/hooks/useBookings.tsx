import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

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
  return useQuery({
    queryKey: ["bookings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select(`
          *,
          guest:guests(id, name, email, tags),
          room:rooms(id, number, type)
        `)
        .order("check_in", { ascending: false });

      if (error) throw error;
      return data as Booking[];
    },
  });
}

export function useCreateBooking() {
  const queryClient = useQueryClient();

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
      // Generate booking number
      const bookingNumber = `BK-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;

      const { data, error } = await supabase
        .from("bookings")
        .insert({
          ...booking,
          booking_number: bookingNumber,
          status: booking.status || "confirmed",
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      queryClient.invalidateQueries({ queryKey: ["activity"] });
      toast({ title: "Booking created successfully" });
    },
    onError: (error) => {
      toast({ title: "Error creating booking", description: error.message, variant: "destructive" });
    },
  });
}

export function useUpdateBookingStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: BookingStatus }) => {
      const { data, error } = await supabase
        .from("bookings")
        .update({ status })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
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

      // AUTOMATION: If checked out, update room and create task
      if (data.status === 'checked_out' && data.room_id) {
        // 1. Update Room Status to Dirty
        supabase.from('rooms').update({ status: 'dirty' }).eq('id', data.room_id).then(() => {
          queryClient.invalidateQueries({ queryKey: ["rooms"] });
        });

        // 2. Create Housekeeping Task
        supabase.from('housekeeping_tasks').insert({
          room_id: data.room_id,
          status: 'pending',
          type: 'checkout_clean',
          priority: 'medium',
          description: `Checkout cleaning for room ${data.room_id}`
        }).then(() => {
          queryClient.invalidateQueries({ queryKey: ["housekeeping"] });
        });
      }

      toast({ title: statusMessages[data.status as BookingStatus] });

    },
    onError: (error) => {
      toast({ title: "Error updating booking", description: error.message, variant: "destructive" });
    },
  });
}

export function useUpdateBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string;[key: string]: any }) => {
      const { data, error } = await supabase
        .from("bookings")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
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
      const { error } = await supabase
        .from("bookings")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      toast({ title: "Booking deleted successfully" });
    },
    onError: (error) => {
      toast({ title: "Error deleting booking", description: error.message, variant: "destructive" });
    },
  });
}
