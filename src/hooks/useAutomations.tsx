import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { mockStore } from "@/lib/mockStore";
import { toast } from "@/hooks/use-toast";

export interface AutomationRule {
  id: string;
  name: string;
  description?: string | null;
  trigger_event?: string;
  trigger?: string;
  trigger_condition?: Record<string, unknown>;
  action_type?: string;
  action?: string;
  action_config?: Record<string, unknown>;
  is_active?: boolean;
  enabled?: boolean;
  config?: Record<string, unknown>;
  execution_count?: number;
  last_triggered_at?: string | null;
  created_at: string;
  updated_at?: string;
}

import { useAuth } from "@/hooks/useAuth";

export function useAutomations() {
  const { hotelId } = useAuth();

  return useQuery({
    queryKey: ["automations", hotelId],
    queryFn: async () => {
      if (!hotelId) return [];
      return await mockStore.automations.getAll(hotelId);
    },
    enabled: !!hotelId,
  });
}

export function useToggleAutomation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      return await mockStore.automations.update(id, { is_active, enabled: is_active });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["automations"] });
      toast({
        title: (data.is_active || data.enabled) ? "Automation enabled" : "Automation disabled",
        description: data.name,
      });
    },
    onError: (error: any) => {
      toast({ title: "Error updating automation", description: error.message, variant: "destructive" });
    },
  });
}

export function useCreateAutomation() {
  const queryClient = useQueryClient();
  const { hotelId } = useAuth();

  return useMutation({
    mutationFn: async (automation: {
      name: string;
      description?: string | null;
      trigger_event: string;
      action_type: string;
      is_active?: boolean;
    }) => {
      return await mockStore.automations.create({
        ...automation,
        is_active: automation.is_active ?? true,
        enabled: automation.is_active ?? true,
      }, hotelId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["automations"] });
      toast({ title: "Automation rule created successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error creating automation", description: error.message, variant: "destructive" });
    },
  });
}

export function useDeleteAutomation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await mockStore.automations.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["automations"] });
      toast({ title: "Automation rule deleted" });
    },
    onError: (error: any) => {
      toast({ title: "Error deleting automation", description: error.message, variant: "destructive" });
    },
  });
}
