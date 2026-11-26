import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, hotelParams } from "@/lib/api";
import type { Automation as CanonicalAutomation, AutomationAction, AutomationCreateInput, AutomationExecution, StoreEventType } from "@/lib/types";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

export type { AutomationAction, StoreEventType } from "@/lib/types";

/** Canonical automation rule: `enabled`, `trigger`, `action`. */
export type AutomationRule = CanonicalAutomation;

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "An unknown error occurred";
}

export function useAutomations() {
  const { hotelId } = useAuth();

  return useQuery({
    queryKey: ["automations", hotelId],
    queryFn: async () => {
      if (!hotelId) return [];
      return await api.get<AutomationRule[]>("/api/automations", hotelParams(hotelId));
    },
    enabled: !!hotelId,
  });
}

/** Recent rule executions, newest first (GET /api/automations/executions). */
export function useAutomationExecutions() {
  const { hotelId } = useAuth();

  return useQuery({
    queryKey: ["automation-executions", hotelId],
    queryFn: async () => {
      if (!hotelId) return [];
      return await api.get<AutomationExecution[]>("/api/automations/executions", hotelParams(hotelId));
    },
    enabled: !!hotelId,
  });
}

export function useToggleAutomation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      return await api.patch<AutomationRule>(`/api/automations/${id}`, { enabled });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["automations"] });
      toast({
        title: data.enabled ? "Automation enabled" : "Automation disabled",
        description: data.name,
      });
    },
    onError: (error: unknown) => {
      toast({ title: "Error updating automation", description: toErrorMessage(error), variant: "destructive" });
    },
  });
}

export function useCreateAutomation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (automation: AutomationCreateInput) => {
      return await api.post<AutomationRule>("/api/automations", automation);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["automations"] });
      toast({ title: "Automation rule created successfully" });
    },
    onError: (error: unknown) => {
      toast({ title: "Error creating automation", description: toErrorMessage(error), variant: "destructive" });
    },
  });
}

export function useUpdateAutomation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<Pick<CanonicalAutomation, "name" | "description" | "trigger" | "action" | "enabled" | "config">>;
    }) => {
      return await api.patch<AutomationRule>(`/api/automations/${id}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["automations"] });
      toast({ title: "Automation rule updated" });
    },
    onError: (error: unknown) => {
      toast({ title: "Error updating automation", description: toErrorMessage(error), variant: "destructive" });
    },
  });
}

export function useDeleteAutomation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.del(`/api/automations/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["automations"] });
      toast({ title: "Automation rule deleted" });
    },
    onError: (error: unknown) => {
      toast({ title: "Error deleting automation", description: toErrorMessage(error), variant: "destructive" });
    },
  });
}
