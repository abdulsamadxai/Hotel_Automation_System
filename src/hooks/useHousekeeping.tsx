import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, hotelParams } from "@/lib/api";
import type {
  HousekeepingTask as CanonicalTask,
  TaskPriority,
  TaskStatus,
  TaskType,
  TaskWithJoins,
} from "@/lib/types";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useStaff } from "@/hooks/useStaff";

export type { TaskStatus, TaskType, TaskPriority } from "@/lib/types";

/**
 * A housekeeping task with its joined room and assignee, plus a derived
 * overdue flag: due_at is in the past and the task is not done.
 */
export interface HousekeepingTask extends TaskWithJoins {
  is_overdue: boolean;
}

export type Task = HousekeepingTask;

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "An unknown error occurred";
}

function withOverdue(task: TaskWithJoins): HousekeepingTask {
  const is_overdue =
    task.status !== "completed" &&
    !!task.due_at &&
    new Date(task.due_at).getTime() < Date.now();
  return { ...task, is_overdue };
}

export function useHousekeepingTasks() {
  const { hotelId, role, user } = useAuth();
  // The staff list gives the current user's staff record, so the
  // housekeeping role only sees tasks assigned to them.
  const { data: staff = [] } = useStaff();

  return useQuery({
    queryKey: ["housekeeping", hotelId, role, user?.id],
    queryFn: async () => {
      if (!hotelId) return [];

      let tasks = await api.get<TaskWithJoins[]>("/api/housekeeping", hotelParams(hotelId));

      // Role isolation: Housekeeping only sees their own tasks.
      if (role === 'housekeeping') {
        const mine = staff.find((s) => s.user_id === user?.id);
        if (mine) {
          tasks = tasks.filter(t => t.assigned_to === mine.id);
        } else {
          return []; // No staff record, no access
        }
      }

      return tasks.map(withOverdue);
    },
    enabled: !!hotelId,
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (task: {
      room_id: string;
      type: TaskType;
      priority: TaskPriority;
      assigned_to?: string | null;
      notes?: string;
      description?: string;
      due_at?: string;
    }) => {
      return await api.post<TaskWithJoins>("/api/housekeeping", {
        room_id: task.room_id,
        type: task.type,
        priority: task.priority,
        description: task.description ?? "",
        assigned_to: task.assigned_to ?? null,
        due_at: task.due_at ?? null,
        notes: task.notes,
        status: "pending",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["housekeeping"] });
      queryClient.invalidateQueries({ queryKey: ["activity"] });
      toast({ title: "Task created successfully" });
    },
    onError: (error: unknown) => {
      toast({ title: "Error creating task", description: toErrorMessage(error), variant: "destructive" });
    },
  });
}

export function useUpdateTaskStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: TaskStatus }) => {
      return await api.patch<TaskWithJoins>(`/api/housekeeping/${id}`, { status });
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
    onError: (error: unknown) => {
      toast({ title: "Error updating task", description: toErrorMessage(error), variant: "destructive" });
    },
  });
}

export function useAssignTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, assigned_to }: { id: string; assigned_to: string }) => {
      return await api.patch<TaskWithJoins>(`/api/housekeeping/${id}`, { assigned_to });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["housekeeping"] });
      toast({ title: "Task assigned successfully" });
    },
    onError: (error: unknown) => {
      toast({ title: "Error assigning task", description: toErrorMessage(error), variant: "destructive" });
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CanonicalTask> & { id: string }) => {
      return await api.patch<TaskWithJoins>(`/api/housekeeping/${id}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["housekeeping"] });
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      queryClient.invalidateQueries({ queryKey: ["activity"] });
      toast({ title: "Task updated successfully" });
    },
    onError: (error: unknown) => {
      toast({ title: "Error updating task", description: toErrorMessage(error), variant: "destructive" });
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.del(`/api/housekeeping/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["housekeeping"] });
      toast({ title: "Task deleted successfully" });
    },
    onError: (error: unknown) => {
      toast({ title: "Error deleting task", description: toErrorMessage(error), variant: "destructive" });
    },
  });
}
