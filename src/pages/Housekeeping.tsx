import { useState, useEffect } from "react";
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
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Clock, CheckCircle2, AlertCircle, Zap, Play, Loader2, Trash2, Edit } from "lucide-react";
import { useHousekeepingTasks, useCreateTask, useUpdateTask, useUpdateTaskStatus, useAssignTask, useDeleteTask, TaskStatus, TaskType, TaskPriority, type HousekeepingTask } from "@/hooks/useHousekeeping";
import { useRealtimeHousekeeping } from "@/hooks/useActivity";
import { useRooms } from "@/hooks/useRooms";
import { useStaff } from "@/hooks/useStaff";
import { useAuth } from "@/hooks/useAuth";
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

export default function Housekeeping() {
  useRealtimeHousekeeping();
  const { role } = useAuth();
  const { data: allTasks = [], isLoading } = useHousekeepingTasks();

  // Notification for Housekeeping — the hook already filters to the
  // housekeeper's own tasks (by `assigned_to`), so `allTasks` is their list.
  const pendingCount = role === 'housekeeping'
    ? allTasks.filter(t => t.status === 'pending').length
    : 0;
  useEffect(() => {
    if (role === 'housekeeping' && pendingCount > 0) {
      toast({
        title: "Tasks Notification",
        description: `You have ${pendingCount} pending cleaning tasks assigned to you.`,
      });
    }
  }, [pendingCount, role]);
  const { data: rooms = [] } = useRooms();
  const { data: staffMembers = [] } = useStaff();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const updateStatus = useUpdateTaskStatus();
  const assignTask = useAssignTask();
  const deleteTask = useDeleteTask();

  // No re-filtering here: useHousekeepingTasks already returns only the
  // housekeeper's own tasks for role 'housekeeping' (filtered by assigned_to).
  const tasks = allTasks;

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<HousekeepingTask | null>(null);
  const [formData, setFormData] = useState({
    roomId: "",
    type: "checkout_clean" as TaskType,
    priority: "medium" as TaskPriority,
    assignedTo: "",
  });

  const handleOpenDialog = (task?: HousekeepingTask) => {
    if (task) {
      setEditingTask(task);
      setFormData({
        roomId: task.room_id,
        type: task.type,
        priority: task.priority,
        assignedTo: task.assigned_to || "",
      });
    } else {
      setEditingTask(null);
      setFormData({ roomId: "", type: "checkout_clean", priority: "medium", assignedTo: "" });
    }
    setIsDialogOpen(true);
  };

  // Overdue is derived by the hook (`is_overdue`: due_at passed, not completed),
  // not the stored status — a stored 'overdue' status is never set by the store.
  const overdueCount = tasks.filter((t) => t.is_overdue).length;

  const housekeepingStaff = staffMembers.filter((s) => s.role === "housekeeping");

  const handleSaveTask = async () => {
    if (editingTask) {
      await updateTask.mutateAsync({
        id: editingTask.id,
        room_id: formData.roomId,
        type: formData.type,
        priority: formData.priority,
        assigned_to: formData.assignedTo || null,
      });
    } else {
      await createTask.mutateAsync({
        room_id: formData.roomId,
        type: formData.type,
        priority: formData.priority,
        assigned_to: formData.assignedTo || null,
        due_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      });
    }
    setIsDialogOpen(false);
    setEditingTask(null);
    setFormData({ roomId: "", type: "checkout_clean", priority: "medium", assignedTo: "" });
  };

  const handleStartTask = async (taskId: string) => {
    await updateStatus.mutateAsync({ id: taskId, status: "in_progress" });
  };

  const handleCompleteTask = async (taskId: string) => {
    await updateStatus.mutateAsync({ id: taskId, status: "completed" });
  };

  const handleAssignTask = async (taskId: string, assignedTo: string) => {
    await assignTask.mutateAsync({ id: taskId, assigned_to: assignedTo });
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
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {role === 'housekeeping' ? "My Cleaning Tasks" : "Housekeeping Management"}
            </h1>
            <p className="text-muted-foreground">
              {role === 'housekeeping' ? "Your assigned duties for today" : "Manage cleaning tasks and room readiness"}
            </p>
          </div>
          {role !== 'housekeeping' && (
            <Button className="gap-2" onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4" />
              Create Task
            </Button>
          )}
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingTask ? "Edit Housekeeping Task" : "Create Housekeeping Task"}</DialogTitle>
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
                  value={formData.assignedTo}
                  onValueChange={(v) => setFormData({ ...formData, assignedTo: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select staff member" />
                  </SelectTrigger>
                  <SelectContent>
                    {housekeepingStaff.map((staff) => (
                      <SelectItem key={staff.id} value={staff.id}>
                        {staff.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={handleSaveTask}
                disabled={createTask.isPending || updateTask.isPending || !formData.roomId}
                className="w-full"
              >
                {createTask.isPending || updateTask.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : (editingTask ? "Update Task" : "Create Task")}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="glass-card p-4 text-center">
            <p className="text-2xl font-bold">{tasks.filter((t) => t.status === 'pending').length}</p>
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
            <h3 className="font-semibold">
              {role === 'housekeeping' ? "My Assigned Tasks" : "All Housekeeping Tasks"}
            </h3>
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
                      {task.assignee?.full_name || (
                        role !== 'housekeeping' ? (
                          <Select onValueChange={(v) => handleAssignTask(task.id, v)}>
                            <SelectTrigger className="w-32 h-8">
                              <SelectValue placeholder="Assign" />
                            </SelectTrigger>
                            <SelectContent>
                              {housekeepingStaff.map((staff) => (
                                <SelectItem key={staff.id} value={staff.id}>
                                  {staff.full_name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : "Unassigned"
                      )}
                    </TableCell>
                    <TableCell>
                      {task.due_at ? format(new Date(task.due_at), "h:mm a") : "N/A"}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={task.is_overdue ? "overdue" : task.status} />
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
                        {role !== 'housekeeping' && (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 text-primary"
                              onClick={() => handleOpenDialog(task)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 text-destructive"
                              onClick={() => {
                                if (confirm("Delete this task?")) {
                                  deleteTask.mutate(task.id);
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
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
