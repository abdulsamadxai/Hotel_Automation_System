import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { mockStore } from "@/lib/mockStore";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

export type StaffRole = "housekeeping" | "manager" | "owner" | "staff";
export type StaffStatus = "on_duty" | "off_duty" | "break" | "active";

export interface StaffMember {
  id: string;
  user_id: string | null;
  name?: string;
  full_name?: string;
  email: string | null;
  phone: string | null;
  role: StaffRole;
  status: StaffStatus;
  shift?: string | null;
  hire_date?: string;
  created_at: string;
  updated_at?: string;
}

export function useStaff() {
  const { hotelId } = useAuth();

  return useQuery({
    queryKey: ["staff", hotelId],
    queryFn: async () => {
      if (!hotelId) return [];
      return await mockStore.staff.getAll(hotelId);
    },
    enabled: !!hotelId,
  });
}

export function useGlobalStaff() {
  return useQuery({
    queryKey: ['global-staff'],
    queryFn: async () => {
      return await mockStore.staff.getAll('global');
    }
  });
}

export function useCreateStaff() {
  const queryClient = useQueryClient();
  const { hotelId: currentHotelId } = useAuth();

  return useMutation({
    mutationFn: async (staff: {
      name?: string;
      full_name?: string;
      email?: string;
      password?: string;
      phone?: string;
      role?: StaffRole;
      shift?: string;
      status?: StaffStatus;
    }) => {
      const hotelId = currentHotelId;
      if (!hotelId) throw new Error("Could not determine hotel property context.");

      const staffData = {
        ...staff,
        full_name: staff.full_name || staff.name,
        name: staff.name || staff.full_name,
      };

      return await mockStore.staff.create(staffData, hotelId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff"] });
      toast({ title: "Staff member added successfully", description: "Account created and linked to your hotel." });
    },
    onError: (error: any) => {
      toast({ title: "Error adding staff", description: error.message, variant: "destructive" });
    },
  });
}

export function useUpdateStaff() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<StaffMember> & { id: string }) => {
      return await mockStore.staff.update(id, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff"] });
      toast({ title: "Staff member updated successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error updating staff", description: error.message, variant: "destructive" });
    },
  });
}

export function useUpdateStaffStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: StaffStatus }) => {
      return await mockStore.staff.update(id, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff"] });
      toast({ title: "Staff status updated" });
    },
    onError: (error: any) => {
      toast({ title: "Error updating status", description: error.message, variant: "destructive" });
    },
  });
}

export function useDeleteStaff() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await mockStore.staff.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff"] });
      toast({ title: "Staff member removed successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error removing staff", description: error.message, variant: "destructive" });
    },
  });
}
