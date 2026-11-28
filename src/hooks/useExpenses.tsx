import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, hotelParams, writeHotelParams } from "@/lib/api";
import type { Expense as CanonicalExpense } from "@/lib/types";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

export type Expense = CanonicalExpense;

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "An unknown error occurred";
}

export function useExpenses(hotelId?: string) {
    const { hotelId: authHotelId } = useAuth();
    const targetHotelId = hotelId || authHotelId;

    return useQuery({
        queryKey: ["expenses", targetHotelId],
        queryFn: async () => {
            if (!targetHotelId) return [];
            return await api.get<Expense[]>("/api/expenses", hotelParams(targetHotelId));
        },
        enabled: !!targetHotelId,
    });
}

export function useCreateExpense() {
    const queryClient = useQueryClient();
    const { role, hotelId } = useAuth();

    return useMutation({
        mutationFn: async (expense: Omit<Expense, "id" | "hotel_id" | "created_at">) => {
            return await api.post<Expense>("/api/expenses", {
                ...expense,
                ...writeHotelParams(role, hotelId),
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["expenses"] });
            toast({ title: "Expense recorded successfully" });
        },
        onError: (error: unknown) => {
            toast({ title: "Error recording expense", description: toErrorMessage(error), variant: "destructive" });
        },
    });
}

export function useDeleteExpense() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            await api.del(`/api/expenses/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["expenses"] });
            toast({ title: "Expense deleted successfully" });
        },
        onError: (error: unknown) => {
            toast({ title: "Error deleting expense", description: toErrorMessage(error), variant: "destructive" });
        },
    });
}
