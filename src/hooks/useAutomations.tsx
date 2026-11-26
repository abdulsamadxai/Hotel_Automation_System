import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { mockStore, type AutomationCreateInput } from "@/lib/mockStore";
import type { Automation as CanonicalAutomation, AutomationAction, StoreEventType } from "@/lib/types";
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
      return await mockStore.automations.getAll(hotelId);
    },
    enabled: !!hotelId,
  });
}

export function useToggleAutomation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      return await mockStore.automations.update(id, { enabled });
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
  const { hotelId } = useAuth();

  return useMutation({
    mutationFn: async (automation: AutomationCreateInput) => {
      return await mockStore.automations.create(automation, hotelId);
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
      return await mockStore.automations.update(id, updates);
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
      await mockStore.automations.delete(id);
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
