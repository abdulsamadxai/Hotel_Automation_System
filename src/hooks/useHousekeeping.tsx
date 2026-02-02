import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export type TaskStatus = "pending" | "in_progress" | "completed" | "overdue";
export type TaskType = "checkout_clean" | "stay_clean" | "deep_clean" | "inspection" | "maintenance";
export type TaskPriority = "low" | "medium" | "high";

export interface HousekeepingTask {
  id: string;
  task_number: string;
  room_id: string;
  booking_id: string | null;
  type: TaskType;
  status: TaskStatus;
  priority: TaskPriority;
  assignee_id: string | null;
  automation_triggered: boolean;
  notes: string | null;
  due_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  room?: { id: string; number: string; type: string } | null;
  assignee?: { id: string; name: string } | null;
}

export function useHousekeepingTasks() {
  return useQuery({
    queryKey: ["housekeeping"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("housekeeping_tasks")
        .select(`
          *,
          room:rooms(id, number, type),
          assignee:staff_members(id, name)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as HousekeepingTask[];
    },
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (task: {
      room_id: string;
      type: TaskType;
      priority: TaskPriority;
      assignee_id?: string;
      notes?: string;
      due_at?: string;
    }) => {
      const taskNumber = `HK-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;

      const { data, error } = await supabase
        .from("housekeeping_tasks")
        .insert({
          ...task,
          task_number: taskNumber,
          status: "pending" as TaskStatus,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["housekeeping"] });
      queryClient.invalidateQueries({ queryKey: ["activity"] });
      toast({ title: "Task created successfully" });
    },
    onError: (error) => {
      toast({ title: "Error creating task", description: error.message, variant: "destructive" });
    },
  });
}

export function useUpdateTaskStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: TaskStatus }) => {
      const { data, error } = await supabase
        .from("housekeeping_tasks")
        .update({ status })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["housekeeping"] });
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      queryClient.invalidateQueries({ queryKey: ["activity"] });

      const statusMessages: Record<TaskStatus, string> = {
        pending: "Task set to pending",
        in_progress: "Task started",
        completed: "Task completed - room is now available",
        overdue: "Task marked as overdue",
      };

      // AUTOMATION: If task is completed, mark the room as available
      if (data.status === 'completed' && data.room_id) {
        supabase.from('rooms').update({ status: 'available' }).eq('id', data.room_id).then(() => {
          queryClient.invalidateQueries({ queryKey: ["rooms"] });
        });
      }

      toast({ title: statusMessages[data.status as TaskStatus] });
    },
    onError: (error) => {
      toast({ title: "Error updating task", description: error.message, variant: "destructive" });
    },
  });
}

export function useAssignTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, assignee_id }: { id: string; assignee_id: string }) => {
      const { data, error } = await supabase
        .from("housekeeping_tasks")
        .update({ assignee_id })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["housekeeping"] });
      toast({ title: "Task assigned successfully" });
    },
    onError: (error) => {
      toast({ title: "Error assigning task", description: error.message, variant: "destructive" });
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string;[key: string]: any }) => {
      const { data, error } = await supabase
        .from("housekeeping_tasks")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["housekeeping"] });
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      queryClient.invalidateQueries({ queryKey: ["activity"] });
      toast({ title: "Task updated successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error updating task", description: error.message, variant: "destructive" });
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("housekeeping_tasks")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["housekeeping"] });
      toast({ title: "Task deleted successfully" });
    },
    onError: (error) => {
      toast({ title: "Error deleting task", description: error.message, variant: "destructive" });
    },
  });
}
