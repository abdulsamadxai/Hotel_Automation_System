import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { mockStore } from "@/lib/mockStore";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

export interface Expense {
    id: string;
    amount: number;
    category: string;
    description: string;
    date: string;  // Primary field used in mockData
    expense_date?: string;  // Legacy field for compatibility
    vendor?: string;
    created_by?: string;
    created_at: string;
    hotel_id?: string;
    recorded_by?: string;
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
        mutationFn: async (expense: Partial<Expense>) => {
            return await mockStore.expenses.create(expense, hotelId);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["expenses"] });
            toast({ title: "Expense recorded successfully" });
        },
        onError: (error: any) => {
            toast({ title: "Error recording expense", description: error.message, variant: "destructive" });
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
        onError: (error: any) => {
            toast({ title: "Error deleting expense", description: error.message, variant: "destructive" });
        },
    });
}
