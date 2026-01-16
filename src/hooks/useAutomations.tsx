import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface AutomationRule {
  id: string;
  name: string;
  description: string | null;
  trigger_event: string;
  trigger_condition: Record<string, unknown>;
  action_type: string;
  action_config: Record<string, unknown>;
  is_active: boolean;
  execution_count: number;
  last_triggered_at: string | null;
  created_at: string;
  updated_at: string;
}

export function useAutomations() {
  return useQuery({
    queryKey: ["automations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("automation_rules")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as AutomationRule[];
    },
  });
}

export function useToggleAutomation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { data, error } = await supabase
        .from("automation_rules")
        .update({ is_active })
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["automations"] });
      toast({ 
        title: data.is_active ? "Automation enabled" : "Automation disabled",
        description: data.name,
      });
    },
    onError: (error) => {
      toast({ title: "Error updating automation", description: error.message, variant: "destructive" });
    },
  });
}

export function useCreateAutomation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (automation: {
      name: string;
      description?: string | null;
      trigger_event: string;
      action_type: string;
      is_active?: boolean;
    }) => {
      const { data, error } = await supabase
        .from("automation_rules")
        .insert([{
          name: automation.name,
          description: automation.description,
          trigger_event: automation.trigger_event,
          action_type: automation.action_type,
          is_active: automation.is_active ?? true,
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["automations"] });
      toast({ title: "Automation rule created successfully" });
    },
    onError: (error) => {
      toast({ title: "Error creating automation", description: error.message, variant: "destructive" });
    },
  });
}

export function useDeleteAutomation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("automation_rules")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["automations"] });
      toast({ title: "Automation rule deleted" });
    },
    onError: (error) => {
      toast({ title: "Error deleting automation", description: error.message, variant: "destructive" });
    },
  });
}
