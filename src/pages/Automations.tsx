import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus,
  Zap,
  ArrowRight,
  Clock,
  Play,
  Edit,
  Trash2,
  Loader2,
} from "lucide-react";
import { useAutomations, useToggleAutomation, useCreateAutomation, useDeleteAutomation } from "@/hooks/useAutomations";
import { formatDistanceToNow } from "date-fns";

const triggerEvents = [
  { value: "booking.created", label: "Booking Created" },
  { value: "booking.checked_in", label: "Guest Checked In" },
  { value: "booking.checked_out", label: "Guest Checked Out" },
  { value: "booking.cancelled", label: "Booking Cancelled" },
  { value: "room.status_changed", label: "Room Status Changed" },
  { value: "task.created", label: "Task Created" },
  { value: "task.completed", label: "Task Completed" },
  { value: "task.overdue", label: "Task Overdue" },
  { value: "invoice.created", label: "Invoice Created" },
  { value: "invoice.overdue", label: "Invoice Overdue" },
];

const actionTypes = [
  { value: "create_task", label: "Create Housekeeping Task" },
  { value: "create_alert", label: "Create Alert" },
  { value: "send_notification", label: "Send Notification" },
  { value: "update_room_status", label: "Update Room Status" },
  { value: "generate_invoice", label: "Generate Invoice" },
  { value: "escalate", label: "Escalate to Manager" },
];

export default function Automations() {
  const { data: rules = [], isLoading } = useAutomations();
  const toggleAutomation = useToggleAutomation();
  const createAutomation = useCreateAutomation();
  const deleteAutomation = useDeleteAutomation();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    trigger_event: "",
    action_type: "",
  });

  const activeRules = rules.filter((r) => r.is_active).length + 5; // +5 for System Rules
  const totalExecutions = rules.reduce((sum, r) => sum + (r.execution_count || 0), 0);

  // Core System Automations (Always Active via SQL Triggers)
  const SYSTEM_AUTOMATIONS = [
    {
      id: "sys-1",
      name: "Auto Check-In Flow",
      description: "When Booking is Checked In → Mark Room Occupied & Ensure Invoice Exists",
      trigger_event: "booking.checked_in",
      action_type: "update_room_status",
      is_active: true,
      execution_count: 0,
      is_system: true,
    },
    {
      id: "sys-2",
      name: "Checkout Cleaning Task",
      description: "When Booking is Checked Out → Mark Room Dirty, Create Task & Notify Staff",
      trigger_event: "booking.checked_out",
      action_type: "create_task",
      is_active: true,
      execution_count: 0,
      is_system: true,
    },
    {
      id: "sys-3",
      name: "Cancellation Cleanup",
      description: "When Booking Cancelled → Free Room, Cancel Invoice & Remove Tasks",
      trigger_event: "booking.cancelled",
      action_type: "update_room_status",
      is_active: true,
      execution_count: 0,
      is_system: true,
    },
    {
      id: "sys-4",
      name: "Room Ready Workflow",
      description: "When Housekeeping Task Completed → Mark Room Available",
      trigger_event: "task.completed",
      action_type: "update_room_status",
      is_active: true,
      execution_count: 0,
      is_system: true,
    },
    {
      id: "sys-5",
      name: "New Booking Alert",
      description: "When Booking Created → Log Activity & Notify Dashboard",
      trigger_event: "booking.created",
      action_type: "create_alert",
      is_active: true,
      execution_count: 0,
      is_system: true,
    },
  ];

  const allRules = [...SYSTEM_AUTOMATIONS, ...rules];


  const handleCreateRule = async () => {
    await createAutomation.mutateAsync({
      name: formData.name,
      description: formData.description || null,
      trigger_event: formData.trigger_event,
      action_type: formData.action_type,
    });
    setIsDialogOpen(false);
    setFormData({ name: "", description: "", trigger_event: "", action_type: "" });
  };

  const handleToggle = async (id: string, currentState: boolean) => {
    await toggleAutomation.mutateAsync({ id, is_active: !currentState });
  };

  const handleDelete = async () => {
    if (deleteId) {
      await deleteAutomation.mutateAsync(deleteId);
      setDeleteId(null);
    }
  };

  const getTriggerLabel = (event: string) => {
    return triggerEvents.find(t => t.value === event)?.label || event;
  };

  const getActionLabel = (action: string) => {
    return actionTypes.find(a => a.value === action)?.label || action;
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
            <h1 className="text-2xl font-bold tracking-tight">Automations</h1>
            <p className="text-muted-foreground">
              Rule-based automation engine for hotel operations
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Create Rule
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Automation Rule</DialogTitle>
                <DialogDescription>Set up a new automation to streamline operations.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Rule Name *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Auto Housekeeping on Checkout"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe what this automation does..."
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Trigger Event *</Label>
                  <Select
                    value={formData.trigger_event}
                    onValueChange={(v) => setFormData({ ...formData, trigger_event: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select trigger" />
                    </SelectTrigger>
                    <SelectContent>
                      {triggerEvents.map((trigger) => (
                        <SelectItem key={trigger.value} value={trigger.value}>
                          {trigger.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Action *</Label>
                  <Select
                    value={formData.action_type}
                    onValueChange={(v) => setFormData({ ...formData, action_type: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select action" />
                    </SelectTrigger>
                    <SelectContent>
                      {actionTypes.map((action) => (
                        <SelectItem key={action.value} value={action.value}>
                          {action.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={handleCreateRule}
                  disabled={createAutomation.isPending || !formData.name || !formData.trigger_event || !formData.action_type}
                  className="w-full"
                >
                  {createAutomation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Automation"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="glass-card p-5">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <Zap className="h-6 w-6" />
              </div>
              <div>
                <p className="text-3xl font-bold">{activeRules}</p>
                <p className="text-sm text-muted-foreground">Active Rules</p>
              </div>
            </div>
          </div>
          <div className="glass-card p-5">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-status-success/10 flex items-center justify-center text-status-success">
                <Play className="h-6 w-6" />
              </div>
              <div>
                <p className="text-3xl font-bold">{totalExecutions}</p>
                <p className="text-sm text-muted-foreground">Total Executions</p>
              </div>
            </div>
          </div>
          <div className="glass-card p-5">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-status-info/10 flex items-center justify-center text-status-info">
                <Clock className="h-6 w-6" />
              </div>
              <div>
                <p className="text-3xl font-bold">{allRules.length}</p>
                <p className="text-sm text-muted-foreground">Total Rules</p>
              </div>
            </div>
          </div>
        </div>

        {/* Automation Rules */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Automation Rules</h2>
          {allRules.length === 0 ? (
            <div className="glass-card p-12 text-center">
              <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
                <Zap className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold mb-2">No automation rules yet</h3>
              <p className="text-muted-foreground text-sm mb-4">
                Create your first automation to streamline hotel operations
              </p>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Rule
              </Button>
            </div>
          ) : (
            <div className="grid gap-4">
              {allRules.map((rule) => (
                <div
                  key={rule.id}
                  className={`glass-card p-5 transition-all duration-300 ${!rule.is_active ? "opacity-60" : ""
                    }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div
                          className={`h-8 w-8 rounded-lg flex items-center justify-center ${rule.is_active
                            ? "bg-primary/10 text-primary"
                            : "bg-muted text-muted-foreground"
                            }`}
                        >
                          <Zap className="h-4 w-4" />
                        </div>
                        <div>
                          <h3 className="font-semibold">{rule.name}</h3>
                          <p className="text-xs text-muted-foreground">
                            {rule.description || "No description"}
                          </p>
                        </div>
                      </div>

                      {/* Trigger → Action Flow */}
                      <div className="flex items-center gap-2 mt-4 p-3 bg-muted/30 rounded-lg">
                        <div className="flex-1">
                          <p className="text-[10px] uppercase text-muted-foreground mb-1">
                            Trigger
                          </p>
                          <p className="text-sm font-mono bg-background/50 px-2 py-1 rounded">
                            {getTriggerLabel(rule.trigger_event)}
                          </p>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div className="flex-1">
                          <p className="text-[10px] uppercase text-muted-foreground mb-1">
                            Action
                          </p>
                          <p className="text-sm font-mono bg-background/50 px-2 py-1 rounded">
                            {getActionLabel(rule.action_type)}
                          </p>
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                        <span>Executions: {rule.execution_count || 0}</span>
                        {rule.last_triggered_at && (
                          <span>Last triggered: {formatDistanceToNow(new Date(rule.last_triggered_at), { addSuffix: true })}</span>
                        )}
                      </div>
                    </div>

                    {/* Controls */}
                    <div className="flex flex-col items-end gap-3">
                      <Switch
                        checked={rule.is_active}
                        onCheckedChange={() => handleToggle(rule.id, rule.is_active)}
                        disabled={toggleAutomation.isPending}
                      />
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => setDeleteId(rule.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Automation Rule</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this automation rule? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
