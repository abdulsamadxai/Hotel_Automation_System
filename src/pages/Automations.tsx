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
  MailWarning,
} from "lucide-react";
import {
  useAutomations,
  useAutomationExecutions,
  useToggleAutomation,
  useCreateAutomation,
  useDeleteAutomation,
  useUpdateAutomation,
} from "@/hooks/useAutomations";
import type { AutomationAction, StoreEventType, Automation } from "@/lib/types";
import { formatDistanceToNow } from "date-fns";

// Canonical trigger values — they match the store event types in src/lib/types.ts.
const triggerOptions: { value: StoreEventType; label: string }[] = [
  { value: "booking.created", label: "Booking Created" },
  { value: "booking.checked_in", label: "Guest Checked In" },
  { value: "booking.checked_out", label: "Guest Checked Out" },
  { value: "booking.cancelled", label: "Booking Cancelled" },
  { value: "room.updated", label: "Room Updated" },
  { value: "invoice.created", label: "Invoice Created" },
  { value: "invoice.paid", label: "Invoice Paid" },
];

// Canonical action values — the only actions the rule engine executes.
const actionOptions: { value: AutomationAction; label: string }[] = [
  { value: "create_housekeeping_task", label: "Create Housekeeping Task" },
  { value: "create_notification", label: "Create Notification" },
  { value: "log_activity", label: "Log Activity" },
  { value: "create_invoice", label: "Create Invoice" },
  {
    value: "send_email",
    label: "Record Email Action (logged only — no email is sent)",
  },
];

function getTriggerLabel(trigger: string): string {
  return triggerOptions.find((t) => t.value === trigger)?.label ?? trigger;
}

function getActionLabel(action: string): string {
  return actionOptions.find((a) => a.value === action)?.label ?? action;
}

interface RuleForm {
  name: string;
  description: string;
  trigger: StoreEventType | "";
  action: AutomationAction | "";
}

const emptyForm: RuleForm = {
  name: "",
  description: "",
  trigger: "",
  action: "",
};

export default function Automations() {
  const { data: rules = [], isLoading } = useAutomations();
  const { data: executions = [] } = useAutomationExecutions();
  const toggleAutomation = useToggleAutomation();
  const createAutomation = useCreateAutomation();
  const deleteAutomation = useDeleteAutomation();
  const updateAutomation = useUpdateAutomation();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<Automation | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formData, setFormData] = useState<RuleForm>(emptyForm);

  // Only real rules from the store are rendered. There are no hardcoded
  // "System Automations" — the previous sys-1..sys-5 block claimed SQL
  // triggers that do not exist in this frontend-only app.
  const activeRules = rules.filter((r) => r.enabled).length;
  const totalExecutions = rules.reduce((sum, r) => sum + r.execution_count, 0);

  const openCreateDialog = () => {
    setEditingRule(null);
    setFormData(emptyForm);
    setIsDialogOpen(true);
  };

  const openEditDialog = (rule: Automation) => {
    setEditingRule(rule);
    setFormData({
      name: rule.name,
      description: rule.description,
      trigger: rule.trigger,
      action: rule.action,
    });
    setIsDialogOpen(true);
  };

  const handleSaveRule = async () => {
    if (!formData.trigger || !formData.action) return;
    const payload = {
      name: formData.name,
      description: formData.description,
      trigger: formData.trigger,
      action: formData.action,
    };
    if (editingRule) {
      await updateAutomation.mutateAsync({ id: editingRule.id, updates: payload });
    } else {
      await createAutomation.mutateAsync(payload);
    }
    setIsDialogOpen(false);
    setEditingRule(null);
    setFormData(emptyForm);
  };

  const handleToggle = async (id: string, currentState: boolean) => {
    await toggleAutomation.mutateAsync({ id, enabled: !currentState });
  };

  const handleDelete = async () => {
    if (deleteId) {
      await deleteAutomation.mutateAsync(deleteId);
      setDeleteId(null);
    }
  };

  const isSaving = createAutomation.isPending || updateAutomation.isPending;

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
          <Dialog
            open={isDialogOpen}
            onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) {
                setEditingRule(null);
                setFormData(emptyForm);
              }
            }}
          >
            <DialogTrigger asChild>
              <Button className="gap-2" onClick={openCreateDialog}>
                <Plus className="h-4 w-4" />
                Create Rule
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingRule ? "Edit Automation Rule" : "Create Automation Rule"}
                </DialogTitle>
                <DialogDescription>
                  {editingRule
                    ? "Update this automation rule. Changes apply to future events only."
                    : "Set up a new automation to streamline operations."}
                </DialogDescription>
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
                    value={formData.trigger}
                    onValueChange={(v) =>
                      setFormData({ ...formData, trigger: v as StoreEventType })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select trigger" />
                    </SelectTrigger>
                    <SelectContent>
                      {triggerOptions.map((trigger) => (
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
                    value={formData.action}
                    onValueChange={(v) =>
                      setFormData({ ...formData, action: v as AutomationAction })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select action" />
                    </SelectTrigger>
                    <SelectContent>
                      {actionOptions.map((action) => (
                        <SelectItem key={action.value} value={action.value}>
                          {action.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {formData.action === "send_email" && (
                  <p className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/40 rounded-lg p-3">
                    <MailWarning className="h-4 w-4 shrink-0 mt-0.5" />
                    This app has no email service. The engine only records the
                    email action in the activity log — no email is actually sent.
                  </p>
                )}
                <Button
                  onClick={handleSaveRule}
                  disabled={
                    isSaving ||
                    !formData.name ||
                    !formData.trigger ||
                    !formData.action
                  }
                  className="w-full"
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : editingRule ? (
                    "Save Changes"
                  ) : (
                    "Create Automation"
                  )}
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
                <p className="text-3xl font-bold">{rules.length}</p>
                <p className="text-sm text-muted-foreground">Total Rules</p>
              </div>
            </div>
          </div>
        </div>

        {/* Automation Rules */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Automation Rules</h2>
          {rules.length === 0 ? (
            <div className="glass-card p-12 text-center">
              <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
                <Zap className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold mb-2">No automation rules yet</h3>
              <p className="text-muted-foreground text-sm mb-4">
                Create your first automation to streamline hotel operations
              </p>
              <Button onClick={openCreateDialog}>
                <Plus className="h-4 w-4 mr-2" />
                Create Rule
              </Button>
            </div>
          ) : (
            <div className="grid gap-4">
              {rules.map((rule) => (
                <div
                  key={rule.id}
                  className={`glass-card p-5 transition-all duration-300 ${
                    !rule.enabled ? "opacity-60" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div
                          className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                            rule.enabled
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
                            {getTriggerLabel(rule.trigger)}
                          </p>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div className="flex-1">
                          <p className="text-[10px] uppercase text-muted-foreground mb-1">
                            Action
                          </p>
                          <p className="text-sm font-mono bg-background/50 px-2 py-1 rounded">
                            {getActionLabel(rule.action)}
                          </p>
                        </div>
                      </div>

                      {rule.action === "send_email" && (
                        <p className="flex items-start gap-2 text-xs text-muted-foreground mt-3">
                          <MailWarning className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                          Demo action: the engine only logs this email in the
                          activity feed — no email is sent.
                        </p>
                      )}

                      {/* Stats */}
                      <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                        <span>Executions: {rule.execution_count}</span>
                        {rule.last_triggered_at ? (
                          <span>
                            Last triggered:{" "}
                            {formatDistanceToNow(new Date(rule.last_triggered_at), {
                              addSuffix: true,
                            })}
                          </span>
                        ) : (
                          <span>Never triggered</span>
                        )}
                      </div>
                    </div>

                    {/* Controls */}
                    <div className="flex flex-col items-end gap-3">
                      <Switch
                        checked={rule.enabled}
                        onCheckedChange={() => handleToggle(rule.id, rule.enabled)}
                        disabled={toggleAutomation.isPending}
                        aria-label={`${rule.enabled ? "Disable" : "Enable"} ${rule.name}`}
                      />
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openEditDialog(rule)}
                          aria-label={`Edit ${rule.name}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => setDeleteId(rule.id)}
                          aria-label={`Delete ${rule.name}`}
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

        {/* Recent executions — every rule run the server recorded */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Recent Executions</h2>
          {executions.length === 0 ? (
            <div className="glass-card p-8 text-center">
              <p className="text-muted-foreground text-sm">
                No automation has run yet. Executions appear here when a rule
                fires.
              </p>
            </div>
          ) : (
            <div className="glass-card divide-y">
              {executions.slice(0, 20).map((execution) => (
                <div key={execution.id} className="p-4 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {execution.automation?.name ?? "Unknown rule"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {execution.event} · {execution.automation?.action ?? ""}
                      {execution.detail ? ` — ${execution.detail}` : ""}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-medium capitalize">{execution.status}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(execution.created_at), { addSuffix: true })}
                    </p>
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
