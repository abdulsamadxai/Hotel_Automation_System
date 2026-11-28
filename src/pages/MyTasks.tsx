import { useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CheckCircle2, Play, Loader2 } from "lucide-react";
import { useHousekeepingTasks, useUpdateTaskStatus, type TaskType, type TaskPriority } from "@/hooks/useHousekeeping";
import { useRealtimeHousekeeping } from "@/hooks/useActivity";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

const taskTypeLabels: Record<TaskType, string> = {
  checkout_clean: "Checkout Clean",
  stay_clean: "Stay Clean",
  deep_clean: "Deep Clean",
  daily_clean: "Daily Clean",
  inspection: "Inspection",
  maintenance: "Maintenance",
};

const priorityColors: Record<TaskPriority, string> = {
  low: "text-muted-foreground",
  medium: "text-status-warning",
  high: "text-status-error",
};

/**
 * Staff-only task view, like the housekeeping "My Tasks" view. A staff
 * member sees only the tasks assigned to them — never the full menu, never
 * other people's tasks (useHousekeepingTasks isolates by role). They can
 * start and complete their own tasks, but cannot create, edit, delete or
 * reassign them.
 */
export default function MyTasks() {
  useRealtimeHousekeeping();
  const { data: tasks = [], isLoading } = useHousekeepingTasks();
  const updateStatus = useUpdateTaskStatus();

  const pendingCount = tasks.filter((t) => t.status === 'pending').length;
  useEffect(() => {
    if (pendingCount > 0) {
      toast({
        title: "Tasks Notification",
        description: `You have ${pendingCount} pending task${pendingCount === 1 ? "" : "s"} assigned to you.`,
      });
    }
  }, [pendingCount]);

  // Overdue is derived by the hook (`is_overdue`: due_at passed, not completed).
  const overdueCount = tasks.filter((t) => t.is_overdue).length;

  const handleStartTask = async (taskId: string) => {
    await updateStatus.mutateAsync({ id: taskId, status: "in_progress" });
  };

  const handleCompleteTask = async (taskId: string) => {
    await updateStatus.mutateAsync({ id: taskId, status: "completed" });
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Tasks</h1>
          <p className="text-muted-foreground">Your assigned duties for today</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div className="glass-card p-4 text-center">
            <p className="text-2xl font-bold">{pendingCount}</p>
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Pending</p>
          </div>
          <div className="glass-card p-4 text-center">
            <p className="text-2xl font-bold text-status-info">{tasks.filter((t) => t.status === 'in_progress').length}</p>
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">In Progress</p>
          </div>
          <div className="glass-card p-4 text-center">
            <p className="text-2xl font-bold text-status-success">{tasks.filter((t) => t.status === 'completed').length}</p>
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Completed</p>
          </div>
          <div className="glass-card p-4 text-center">
            <p className="text-2xl font-bold text-status-error">{overdueCount}</p>
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Overdue</p>
          </div>
        </div>

        <div className="glass-card overflow-hidden">
          <div className="p-4 border-b border-border">
            <h3 className="font-semibold">My Assigned Tasks</h3>
          </div>
          {tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                <CheckCircle2 className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No tasks assigned</h3>
              <p className="text-muted-foreground text-sm max-w-sm">
                Tasks will appear here when you are assigned work.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-border">
                  <TableHead className="text-muted-foreground">Task ID</TableHead>
                  <TableHead className="text-muted-foreground">Room</TableHead>
                  <TableHead className="text-muted-foreground">Type</TableHead>
                  <TableHead className="text-muted-foreground">Due</TableHead>
                  <TableHead className="text-muted-foreground">Status</TableHead>
                  <TableHead className="text-muted-foreground">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.map((task) => (
                  <TableRow
                    key={task.id}
                    className={`border-border hover:bg-muted/30 ${task.is_overdue ? "bg-status-error/5" : ""}`}
                  >
                    <TableCell className="font-mono text-sm">{task.task_number}</TableCell>
                    <TableCell className="font-medium">Room {task.room?.number || "N/A"}</TableCell>
                    <TableCell>
                      <span className={priorityColors[task.priority]}>
                        {taskTypeLabels[task.type]}
                      </span>
                    </TableCell>
                    <TableCell>
                      {task.due_at ? format(new Date(task.due_at), "h:mm a") : "N/A"}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={task.is_overdue ? "overdue" : task.status} />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {task.status === "pending" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleStartTask(task.id)}
                            disabled={updateStatus.isPending}
                          >
                            <Play className="h-3 w-3 mr-1" />
                            Start
                          </Button>
                        )}
                        {task.status === "in_progress" && (
                          <Button
                            size="sm"
                            onClick={() => handleCompleteTask(task.id)}
                            disabled={updateStatus.isPending}
                          >
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Complete
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
