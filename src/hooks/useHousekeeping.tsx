import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { mockStore } from "@/lib/mockStore";
import { toast } from "@/hooks/use-toast";

export type TaskStatus = "pending" | "in_progress" | "completed" | "overdue";
export type TaskType = "checkout_clean" | "stay_clean" | "deep_clean" | "inspection" | "maintenance";
export type TaskPriority = "low" | "medium" | "high";

export interface HousekeepingTask {
  id: string;
  task_number?: string;
  room_id: string;
  booking_id?: string | null;
  type: TaskType;
  status: TaskStatus;
  priority: TaskPriority;
  assignee_id?: string | null;
  assigned_to?: string | null;
  automation_triggered?: boolean;
  notes?: string | null;
  description?: string | null;
  due_at?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  created_at: string;
  updated_at?: string;
  // Joined fields
  room?: { id: string; number: string; type: string } | null;
  assignee?: { id: string; name?: string; full_name?: string } | null;
}

import { useAuth } from "@/hooks/useAuth";

export function useHousekeepingTasks() {
  const { hotelId, role, user } = useAuth();

  return useQuery({
    queryKey: ["housekeeping", hotelId, role, user?.id],
    queryFn: async () => {
      if (!hotelId) return [];

      let tasks = await mockStore.housekeeping.getAll(hotelId);

      // Role isolation: Housekeeping only sees their own tasks
      if (role === 'housekeeping') {
        const staff = await mockStore.staff.getByUserId(user?.id);
        if (staff) {
          tasks = tasks.filter(t => t.assigned_to === staff.id || t.assignee_id === staff.id);
        } else {
          return []; // No staff record, no access
        }
      }

      return tasks;
    },
    enabled: !!hotelId,
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  const { hotelId } = useAuth();

  return useMutation({
    mutationFn: async (task: {
      room_id: string;
      type: TaskType;
      priority: TaskPriority;
      assignee_id?: string;
      assigned_to?: string;
      notes?: string;
      description?: string;
      due_at?: string;
    }) => {
      return await mockStore.housekeeping.create({
        ...task,
        status: "pending" as TaskStatus,
      }, hotelId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["housekeeping"] });
      queryClient.invalidateQueries({ queryKey: ["activity"] });
      toast({ title: "Task created successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error creating task", description: error.message, variant: "destructive" });
    },
  });
}

export function useUpdateTaskStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: TaskStatus }) => {
      return await mockStore.housekeeping.update(id, { status });
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

      toast({ title: statusMessages[data.status as TaskStatus] });
    },
    onError: (error: any) => {
      toast({ title: "Error updating task", description: error.message, variant: "destructive" });
    },
  });
}

export function useAssignTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, assignee_id }: { id: string; assignee_id: string }) => {
      return await mockStore.housekeeping.update(id, { assigned_to: assignee_id, assignee_id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["housekeeping"] });
      toast({ title: "Task assigned successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error assigning task", description: error.message, variant: "destructive" });
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string;[key: string]: any }) => {
      return await mockStore.housekeeping.update(id, updates);
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
      await mockStore.housekeeping.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["housekeeping"] });
      toast({ title: "Task deleted successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error deleting task", description: error.message, variant: "destructive" });
    },
  });
}
