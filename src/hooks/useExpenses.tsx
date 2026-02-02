import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface Expense {
    id: string;
    amount: number;
    category: string;
    description: string;
    expense_date: string;
    created_at: string;
    hotel_id?: string;
    recorded_by?: string;
}

export function useExpenses(hotelId?: string) {
    return useQuery({
        queryKey: ["expenses", hotelId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("expenses")
                .select("*")
                .order("expense_date", { ascending: false });

            if (error) throw error;
            return (data || []) as Expense[];
        },
        enabled: !!hotelId || true, // Allow fetching even without specific ID if needed
    });
}

export function useCreateExpense() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (expense: Partial<Expense>) => {
            const { data, error } = await supabase
                .from("expenses")
                .insert(expense)
                .select()
                .single();

            if (error) throw error;
            return data;
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
            const { error } = await supabase
                .from("expenses")
                .delete()
                .eq("id", id);
            if (error) throw error;
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
