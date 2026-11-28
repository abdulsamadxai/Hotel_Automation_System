import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Clock, User, Users, Loader2, Trash2, Save } from "lucide-react";
import { useStaff, useCreateStaff, useUpdateStaff, useUpdateStaffStatus, useDeleteStaff, StaffRole, StaffStatus, type StaffMember } from "@/hooks/useStaff";
import { useAuth, useUpdatePassword } from "@/hooks/useAuth";
import { useHousekeepingTasks } from "@/hooks/useHousekeeping";
import { format } from "date-fns";

const roleColors: Record<StaffRole | "super_admin", string> = {
  housekeeping: "bg-status-pending/15 text-status-pending",
  manager: "bg-primary/15 text-primary",
  owner: "bg-status-warning/15 text-status-warning",
  staff: "bg-status-info/15 text-status-info",
  super_admin: "bg-status-error/15 text-status-error",
};

const statusColors: Record<StaffStatus, string> = {
  on_duty: "bg-status-success/15 text-status-success",
  off_duty: "bg-muted text-muted-foreground",
  break: "bg-status-warning/15 text-status-warning",
  active: "bg-status-info/15 text-status-info",
};

export default function Staff() {
  const { user } = useAuth();
  const { data: staff = [], isLoading } = useStaff();
  const { data: tasks = [] } = useHousekeepingTasks();
  const createStaff = useCreateStaff();
  const updateStaff = useUpdateStaff();
  const updateStatus = useUpdateStaffStatus();
  const deleteStaff = useDeleteStaff();
  const updatePassword = useUpdatePassword();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  // No password field on create: useCreateStaff creates NO login account.
  // On edit, `password` is only shown when the member has a login user
  // (`user_id`) and, when set, updates that login via auth.updatePassword.
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    password: "",
    currentPassword: "",
    phone: "",
    role: "housekeeping" as StaffRole,
    shift: "morning",
  });

  // The record being edited belongs to the current user when its linked
  // login user is the current user — self-service password changes
  // require the current password server-side.
  const isEditingSelf = !!editingStaff?.user_id && editingStaff.user_id === user?.id;
  const needsCurrentPassword = isEditingSelf && !!formData.password && !formData.currentPassword;

  const onDutyCount = staff.filter((s) => s.status === "on_duty").length;
  const pendingTasks = tasks.filter((t) => t.status === "pending").length;
  const overdueTasks = tasks.filter((t) => t.is_overdue).length;

  const handleOpenDialog = (member?: StaffMember) => {
    if (member) {
      setEditingStaff(member);
      setFormData({
        full_name: member.full_name,
        email: member.email || "",
        password: "", // Don't show existing password
        currentPassword: "",
        phone: member.phone || "",
        role: member.role,
        shift: member.shift || "morning",
      });
    } else {
      setEditingStaff(null);
      setFormData({ full_name: "", email: "", password: "", currentPassword: "", phone: "", role: "housekeeping", shift: "morning" });
    }
    setIsDialogOpen(true);
  };

  const handleSaveStaff = async () => {
    if (editingStaff) {
      await updateStaff.mutateAsync({
        id: editingStaff.id,
        full_name: formData.full_name,
        email: formData.email || null,
        phone: formData.phone || null,
        role: formData.role,
        shift: formData.shift,
      });
      // Password changes apply to the LOGIN user, not the staff record.
      if (formData.password && editingStaff.user_id) {
        await updatePassword.mutateAsync({
          userId: editingStaff.user_id,
          newPassword: formData.password,
          // Self-service: the server requires the current password.
          // Admin-resetting-someone-else sends none.
          currentPassword: isEditingSelf ? formData.currentPassword : undefined,
        });
      }
    } else {
      await createStaff.mutateAsync({
        full_name: formData.full_name,
        email: formData.email || null,
        phone: formData.phone || null,
        role: formData.role,
        shift: formData.shift,
      });
    }
    setIsDialogOpen(false);
    setEditingStaff(null);
    setFormData({ full_name: "", email: "", password: "", currentPassword: "", phone: "", role: "housekeeping", shift: "morning" });
  };

  const handleStatusChange = async (staffId: string, status: StaffStatus) => {
    await updateStatus.mutateAsync({ id: staffId, status });
  };

  const handleDeleteStaff = async (staffId: string) => {
    await deleteStaff.mutateAsync(staffId);
  };

  // Calculate task counts per staff member
  const getStaffTaskCounts = (staffId: string) => {
    const assignedTasks = tasks.filter(t => t.assigned_to === staffId);
    const completed = assignedTasks.filter(t => t.status === "completed").length;
    return { total: assignedTasks.length, completed };
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
            <h1 className="text-2xl font-bold tracking-tight">Staff & Tasks</h1>
            <p className="text-muted-foreground">
              Manage staff schedules and task assignments
            </p>
          </div>
          <div className="flex gap-2">
            <Button className="gap-2" onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4" />
              Add Staff
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingStaff ? "Edit Staff Member" : "Add Staff Member"}</DialogTitle>
                  <DialogDescription>
                    {editingStaff
                      ? "Update the details and permissions for this staff member."
                      : "Register a new staff member. This creates a staff record only — no login account is created here; login accounts are created via sign-up."}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Name *</Label>
                    <Input
                      value={formData.full_name}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                      placeholder="Full name"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Email *</Label>
                      <Input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="email@example.com"
                        required
                      />
                    </div>
                    {editingStaff && editingStaff.user_id ? (
                      <div className="space-y-2">
                        <Label>New Login Password (optional)</Label>
                        <Input
                          type="password"
                          value={formData.password}
                          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                          placeholder="••••••••"
                        />
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Label>Login</Label>
                        <p className="text-sm text-muted-foreground pt-2">
                          {editingStaff
                            ? "No login account linked to this member."
                            : "No login account is created with this form."}
                        </p>
                      </div>
                    )}
                  </div>
                  {isEditingSelf && (
                    <div className="space-y-2">
                      <Label>Current Password *</Label>
                      <Input
                        type="password"
                        value={formData.currentPassword}
                        onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                        placeholder="Your current password"
                      />
                      <p className="text-xs text-muted-foreground">
                        Required to change your own login password.
                      </p>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+1 234 567 8900"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Role</Label>
                      <Select
                        value={formData.role}
                        onValueChange={(v) => setFormData({ ...formData, role: v as StaffRole })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="housekeeping">Housekeeping</SelectItem>
                          <SelectItem value="manager">Manager</SelectItem>
                          <SelectItem value="owner">Owner</SelectItem>
                          <SelectItem value="staff">Staff</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Shift</Label>
                      <Select
                        value={formData.shift}
                        onValueChange={(v) => setFormData({ ...formData, shift: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="morning">Morning (6AM - 2PM)</SelectItem>
                          <SelectItem value="afternoon">Afternoon (2PM - 10PM)</SelectItem>
                          <SelectItem value="night">Night (10PM - 6AM)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button
                    onClick={handleSaveStaff}
                    disabled={createStaff.isPending || updateStaff.isPending || updatePassword.isPending || !formData.full_name || needsCurrentPassword}
                    className="w-full"
                  >
                    {createStaff.isPending || updateStaff.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : (editingStaff ? "Update Staff" : "Add Staff Member")}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div className="glass-card p-4">
            <p className="text-2xl font-bold text-status-success">{onDutyCount}</p>
            <p className="text-sm text-muted-foreground">On Duty</p>
          </div>
          <div className="glass-card p-4">
            <p className="text-2xl font-bold">{staff.length}</p>
            <p className="text-sm text-muted-foreground">Total Staff</p>
          </div>
          <div className="glass-card p-4">
            <p className="text-2xl font-bold text-status-warning">{pendingTasks}</p>
            <p className="text-sm text-muted-foreground">Pending Tasks</p>
          </div>
          <div className="glass-card p-4">
            <p className="text-2xl font-bold text-status-error">{overdueTasks}</p>
            <p className="text-sm text-muted-foreground">Overdue</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Staff List */}
          <div className="glass-card overflow-hidden">
            <div className="p-4 border-b border-border">
              <h3 className="font-semibold">Staff Members</h3>
            </div>
            {staff.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <div className="h-12 w-12 rounded-full bg-muted/50 flex items-center justify-center mb-3">
                  <Users className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="font-semibold mb-1">No staff members yet</h3>
                <p className="text-muted-foreground text-sm">
                  Add staff members to manage schedules
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {staff.map((member) => {
                  const taskCounts = getStaffTaskCounts(member.id);
                  return (
                    <div
                      key={member.id}
                      className="p-4 hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                            {member.full_name
                              ? member.full_name.split(" ").filter(Boolean).map((n) => n[0]).join("").toUpperCase().slice(0, 2)
                              : "U"}
                          </div>
                          <div>
                            <p className="font-medium">{member.full_name}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className={roleColors[member.role]}>
                                {member.role}
                              </Badge>
                              <Select
                                value={member.status || 'off_duty'}
                                onValueChange={(v) => handleStatusChange(member.id, v as StaffStatus)}
                              >
                                <SelectTrigger className="h-6 w-auto border-0 p-0">
                                  <Badge variant="outline" className={statusColors[member.status || 'off_duty']}>
                                    {(member.status || 'off_duty').replace("_", " ")}
                                  </Badge>
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="on_duty">On Duty</SelectItem>
                                  <SelectItem value="off_duty">Off Duty</SelectItem>
                                  <SelectItem value="break">Break</SelectItem>
                                  <SelectItem value="active">Active</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-right text-sm">
                            <p className="text-muted-foreground">{member.shift || "No shift"}</p>
                            <p className="text-xs mt-1">
                              <span className="text-status-success">{taskCounts.completed}</span>
                              <span className="text-muted-foreground">/{taskCounts.total} tasks</span>
                            </p>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-primary"
                              onClick={() => handleOpenDialog(member)}
                            >
                              <Save className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive"
                              onClick={() => handleDeleteStaff(member.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Active Tasks */}
          <div className="glass-card overflow-hidden">
            <div className="p-4 border-b border-border">
              <h3 className="font-semibold">Active Tasks</h3>
            </div>
            {tasks.filter(t => t.status !== "completed").length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <div className="h-12 w-12 rounded-full bg-muted/50 flex items-center justify-center mb-3">
                  <Clock className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="font-semibold mb-1">No active tasks</h3>
                <p className="text-muted-foreground text-sm">
                  Create tasks in Housekeeping to assign to staff
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border max-h-[500px] overflow-y-auto">
                {tasks.filter(t => t.status !== "completed").map((task) => (
                  <div
                    key={task.id}
                    className={`p-4 hover:bg-muted/30 transition-colors ${task.is_overdue ? "bg-status-error/5" : ""
                      }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium">Room {task.room?.number || "N/A"} - {(task.type || 'maintenance').replace("_", " ")}</p>
                        <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                          <User className="h-3 w-3" />
                          <span>{task.assignee?.full_name || "Unassigned"}</span>
                          <span>•</span>
                          <Clock className="h-3 w-3" />
                          <span>{(() => {
                            try {
                              return task.due_at ? format(new Date(task.due_at), "h:mm a") : "No due time";
                            } catch (e) {
                              return "Invalid date";
                            }
                          })()}</span>
                        </div>
                      </div>
                      <StatusBadge
                        status={
                          task.is_overdue
                            ? "overdue"
                            : task.status === "in_progress"
                              ? "in_progress"
                              : task.status === "completed"
                                ? "completed"
                                : "pending"
                        }
                        label={(task.is_overdue ? "overdue" : task.status).replace("_", " ")}
                        size="sm"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div >
      </div >
    </AppLayout >
  );
}
