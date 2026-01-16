import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export type StaffRole = "housekeeping" | "reception" | "maintenance" | "manager";
export type StaffStatus = "on_duty" | "off_duty" | "break";

export interface StaffMember {
  id: string;
  user_id: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  role: StaffRole;
  status: StaffStatus;
  shift: string | null;
  created_at: string;
  updated_at: string;
}

export function useStaff() {
  return useQuery({
    queryKey: ["staff"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("staff_members")
        .select("*")
        .order("name");
      
      if (error) throw error;
      return data as StaffMember[];
    },
  });
}

export function useCreateStaff() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (staff: {
      name: string;
      email?: string;
      phone?: string;
      role?: StaffRole;
      shift?: string;
      status?: StaffStatus;
      user_id?: string | null;
    }) => {
      const { data, error } = await supabase
        .from("staff_members")
        .insert({
          name: staff.name,
          email: staff.email || null,
          phone: staff.phone || null,
          role: staff.role || "housekeeping",
          shift: staff.shift || null,
          status: staff.status || "off_duty",
          user_id: staff.user_id || null,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff"] });
      toast({ title: "Staff member added successfully" });
    },
    onError: (error) => {
      toast({ title: "Error adding staff", description: error.message, variant: "destructive" });
    },
  });
}

export function useUpdateStaff() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<StaffMember> & { id: string }) => {
      const { data, error } = await supabase
        .from("staff_members")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff"] });
      toast({ title: "Staff member updated successfully" });
    },
    onError: (error) => {
      toast({ title: "Error updating staff", description: error.message, variant: "destructive" });
    },
  });
}

export function useUpdateStaffStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: StaffStatus }) => {
      const { data, error } = await supabase
        .from("staff_members")
        .update({ status })
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff"] });
      toast({ title: "Staff status updated" });
    },
    onError: (error) => {
      toast({ title: "Error updating status", description: error.message, variant: "destructive" });
    },
  });
}

export function useDeleteStaff() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("staff_members")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff"] });
      toast({ title: "Staff member removed successfully" });
    },
    onError: (error) => {
      toast({ title: "Error removing staff", description: error.message, variant: "destructive" });
    },
  });
}
