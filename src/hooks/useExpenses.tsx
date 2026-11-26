import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { mockStore } from "@/lib/mockStore";
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
            return await mockStore.expenses.getAll(targetHotelId);
        },
        enabled: !!targetHotelId,
    });
}

export function useCreateExpense() {
    const queryClient = useQueryClient();
    const { hotelId } = useAuth();

    return useMutation({
        mutationFn: async (expense: Omit<Expense, "id" | "hotel_id" | "created_at">) => {
            return await mockStore.expenses.create(expense, hotelId);
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
            await mockStore.expenses.delete(id);
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
