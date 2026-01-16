import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Clock, CheckCircle2, AlertCircle, Zap, Play, Loader2 } from "lucide-react";
import { useHousekeepingTasks, useCreateTask, useUpdateTaskStatus, useAssignTask, TaskStatus, TaskType, TaskPriority } from "@/hooks/useHousekeeping";
import { useRealtimeHousekeeping } from "@/hooks/useActivity";
import { useRooms } from "@/hooks/useRooms";
import { useStaff } from "@/hooks/useStaff";
import { format } from "date-fns";

const taskTypeLabels: Record<TaskType, string> = {
  checkout_clean: "Checkout Clean",
  stay_clean: "Stay Clean",
  deep_clean: "Deep Clean",
  inspection: "Inspection",
  maintenance: "Maintenance",
};

const priorityColors: Record<TaskPriority, string> = {
  low: "text-muted-foreground",
  medium: "text-status-warning",
  high: "text-status-error",
};

export default function Housekeeping() {
  useRealtimeHousekeeping();
  const { data: tasks = [], isLoading } = useHousekeepingTasks();
  const { data: rooms = [] } = useRooms();
  const { data: staffMembers = [] } = useStaff();
  const createTask = useCreateTask();
  const updateStatus = useUpdateTaskStatus();
  const assignTask = useAssignTask();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    roomId: "",
    type: "checkout_clean" as TaskType,
    priority: "medium" as TaskPriority,
    assigneeId: "",
  });

  const statusCounts = tasks.reduce((acc, task) => {
    acc[task.status] = (acc[task.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const housekeepingStaff = staffMembers.filter((s) => s.role === "housekeeping");

  const handleCreateTask = async () => {
    await createTask.mutateAsync({
      room_id: formData.roomId,
      type: formData.type,
      priority: formData.priority,
      assignee_id: formData.assigneeId || undefined,
      due_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours from now
    });
    setIsDialogOpen(false);
    setFormData({ roomId: "", type: "checkout_clean", priority: "medium", assigneeId: "" });
  };

  const handleStartTask = async (taskId: string) => {
    await updateStatus.mutateAsync({ id: taskId, status: "in_progress" });
  };

  const handleCompleteTask = async (taskId: string) => {
    await updateStatus.mutateAsync({ id: taskId, status: "completed" });
  };

  const handleAssignTask = async (taskId: string, assigneeId: string) => {
    await assignTask.mutateAsync({ id: taskId, assignee_id: assigneeId });
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
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Housekeeping</h1>
            <p className="text-muted-foreground">
              Manage cleaning tasks and room readiness
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Create Task
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Housekeeping Task</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Room *</Label>
                  <Select
                    value={formData.roomId}
                    onValueChange={(v) => setFormData({ ...formData, roomId: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select room" />
                    </SelectTrigger>
                    <SelectContent>
                      {rooms.map((room) => (
                        <SelectItem key={room.id} value={room.id}>
                          Room {room.number} - {room.status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Task Type</Label>
                    <Select
                      value={formData.type}
                      onValueChange={(v) => setFormData({ ...formData, type: v as TaskType })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="checkout_clean">Checkout Clean</SelectItem>
                        <SelectItem value="stay_clean">Stay Clean</SelectItem>
                        <SelectItem value="deep_clean">Deep Clean</SelectItem>
                        <SelectItem value="inspection">Inspection</SelectItem>
                        <SelectItem value="maintenance">Maintenance</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Priority</Label>
                    <Select
                      value={formData.priority}
                      onValueChange={(v) => setFormData({ ...formData, priority: v as TaskPriority })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Assign To</Label>
                  <Select
                    value={formData.assigneeId}
                    onValueChange={(v) => setFormData({ ...formData, assigneeId: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select staff member" />
                    </SelectTrigger>
                    <SelectContent>
                      {housekeepingStaff.map((staff) => (
                        <SelectItem key={staff.id} value={staff.id}>
                          {staff.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={handleCreateTask}
                  disabled={createTask.isPending || !formData.roomId}
                  className="w-full"
                >
                  {createTask.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Task"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="glass-card p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-lg bg-status-warning/10 flex items-center justify-center text-status-warning">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{statusCounts.pending || 0}</p>
                <p className="text-xs text-muted-foreground">Pending</p>
              </div>
            </div>
          </div>
          <div className="glass-card p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-lg bg-status-info/10 flex items-center justify-center text-status-info">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{statusCounts.in_progress || 0}</p>
                <p className="text-xs text-muted-foreground">In Progress</p>
              </div>
            </div>
          </div>
          <div className="glass-card p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-lg bg-status-success/10 flex items-center justify-center text-status-success">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{statusCounts.completed || 0}</p>
                <p className="text-xs text-muted-foreground">Completed</p>
              </div>
            </div>
          </div>
          <div className="glass-card p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-lg bg-status-error/10 flex items-center justify-center text-status-error">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{statusCounts.overdue || 0}</p>
                <p className="text-xs text-muted-foreground">Overdue</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tasks Table */}
        <div className="glass-card overflow-hidden">
          <div className="p-4 border-b border-border">
            <h3 className="font-semibold">All Tasks</h3>
          </div>
          {tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                <CheckCircle2 className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No housekeeping tasks</h3>
              <p className="text-muted-foreground text-sm max-w-sm">
                Tasks will appear here when guests check out or when you create them manually.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-border">
                  <TableHead className="text-muted-foreground">Task ID</TableHead>
                  <TableHead className="text-muted-foreground">Room</TableHead>
                  <TableHead className="text-muted-foreground">Type</TableHead>
                  <TableHead className="text-muted-foreground">Assignee</TableHead>
                  <TableHead className="text-muted-foreground">Due</TableHead>
                  <TableHead className="text-muted-foreground">Status</TableHead>
                  <TableHead className="text-muted-foreground">Source</TableHead>
                  <TableHead className="text-muted-foreground">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.map((task) => (
                  <TableRow
                    key={task.id}
                    className={`border-border hover:bg-muted/30 ${
                      task.status === "overdue" ? "bg-status-error/5" : ""
                    }`}
                  >
                    <TableCell className="font-mono text-sm">{task.task_number}</TableCell>
                    <TableCell className="font-medium">Room {task.room?.number || "N/A"}</TableCell>
                    <TableCell>
                      <span className={priorityColors[task.priority]}>
                        {taskTypeLabels[task.type]}
                      </span>
                    </TableCell>
                    <TableCell>
                      {task.assignee?.name || (
                        <Select onValueChange={(v) => handleAssignTask(task.id, v)}>
                          <SelectTrigger className="w-32 h-8">
                            <SelectValue placeholder="Assign" />
                          </SelectTrigger>
                          <SelectContent>
                            {housekeepingStaff.map((staff) => (
                              <SelectItem key={staff.id} value={staff.id}>
                                {staff.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </TableCell>
                    <TableCell>
                      {task.due_at ? format(new Date(task.due_at), "h:mm a") : "N/A"}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={task.status} />
                    </TableCell>
                    <TableCell>
                      {task.automation_triggered && (
                        <div className="flex items-center gap-1 text-primary">
                          <Zap className="h-3 w-3" />
                          <span className="text-xs">Auto</span>
                        </div>
                      )}
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
