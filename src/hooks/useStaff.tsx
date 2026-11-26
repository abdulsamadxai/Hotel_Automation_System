import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, hotelParams } from "@/lib/api";
import type { StaffCreateInput, StaffMember as CanonicalStaff, StaffRole, StaffStatus, StaffWithJoins } from "@/lib/types";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

export type { StaffRole, StaffStatus } from "@/lib/types";

/** Canonical staff member: `full_name` only (no `name`). */
export type StaffMember = CanonicalStaff;

export type StaffWithHotel = StaffWithJoins;

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "An unknown error occurred";
}

export function useStaff() {
  const { hotelId } = useAuth();

  return useQuery({
    queryKey: ["staff", hotelId],
    queryFn: async () => {
      if (!hotelId) return [];
      return await api.get<StaffWithJoins[]>("/api/staff", hotelParams(hotelId));
    },
    enabled: !!hotelId,
  });
}

export function useGlobalStaff() {
  return useQuery({
    queryKey: ['global-staff'],
    queryFn: async () => {
      // Super-admin with no ?hotel_id= sees staff across all hotels.
      return await api.get<StaffWithJoins[]>("/api/staff");
    }
  });
}

export function useCreateStaff() {
  const queryClient = useQueryClient();

  return useMutation({
    // Staff record creation only — it creates NO login user and NO password.
    // A login account is created via sign-up (auth), not from this form.
    mutationFn: async (staff: StaffCreateInput) => {
      return await api.post<StaffMember>("/api/staff", staff);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff"] });
      toast({ title: "Staff member added successfully" });
    },
    onError: (error: unknown) => {
      toast({ title: "Error adding staff", description: toErrorMessage(error), variant: "destructive" });
    },
  });
}

export function useUpdateStaff() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<StaffMember> & { id: string }) => {
      return await api.patch<StaffMember>(`/api/staff/${id}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff"] });
      toast({ title: "Staff member updated successfully" });
    },
    onError: (error: unknown) => {
      toast({ title: "Error updating staff", description: toErrorMessage(error), variant: "destructive" });
    },
  });
}

export function useUpdateStaffStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: StaffStatus }) => {
      return await api.patch<StaffMember>(`/api/staff/${id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff"] });
      toast({ title: "Staff status updated" });
    },
    onError: (error: unknown) => {
      toast({ title: "Error updating status", description: toErrorMessage(error), variant: "destructive" });
    },
  });
}

export function useDeleteStaff() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.del(`/api/staff/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff"] });
      toast({ title: "Staff member removed successfully" });
    },
    onError: (error: unknown) => {
      toast({ title: "Error removing staff", description: toErrorMessage(error), variant: "destructive" });
    },
  });
}
