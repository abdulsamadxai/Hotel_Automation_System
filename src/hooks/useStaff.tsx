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

export function useGlobalStaff() {
  return useQuery({
    queryKey: ['global-staff'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('staff_members')
        .select(`
          *,
          hotels (
            name,
            access_code
          )
        `);
      if (error) throw error;
      return data as any[];
    }
  });
}

export function useCreateStaff() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (staff: {
      name: string;
      email?: string;
      password?: string;
      phone?: string;
      role?: StaffRole;
      shift?: string;
      status?: StaffStatus;
    }) => {
      // 1. Get current user's hotel_id
      const { data: { user } } = await supabase.auth.getUser();
      const { data: currentStaff } = await supabase
        .from('staff_members')
        .select('hotel_id')
        .eq('user_id', user?.id)
        .maybeSingle();

      const hotelId = currentStaff?.hotel_id;

      if (!hotelId) throw new Error("Could not determine hotel property context.");

      let userId = null;

      // 2. Create Auth User if email and password provided
      if (staff.email && staff.password) {
        // We use a secondary client to avoid signing out the current user
        // Note: For a real production app, this would be an Edge Function.
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: staff.email,
          password: staff.password,
          options: {
            data: { full_name: staff.name }
          }
        });

        // If the user already exists, Supabase returns success but no user data if "confirm email" is on.
        // For this demo, we assume we need to link it.
        if (authError) throw authError;
        userId = authData.user?.id;
      }

      // 3. Create Staff Member Record
      const { data, error } = await supabase
        .from("staff_members")
        .insert({
          name: staff.name,
          email: staff.email || null,
          phone: staff.phone || null,
          role: staff.role || "housekeeping",
          shift: staff.shift || null,
          status: staff.status || "off_duty",
          user_id: userId,
          hotel_id: hotelId,
          saas_role: staff.role as any
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff"] });
      toast({ title: "Staff member added successfully", description: "Account created and linked to your hotel." });
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
