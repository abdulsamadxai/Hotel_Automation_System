import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface LineItem {
    description: string;
    amount: number;
    quantity: number;
    type: "charge" | "service" | "tax" | "discount";
}

export interface Invoice {
    id: string;
    invoice_number: string;
    guest_id: string | null;
    booking_id: string | null;
    amount: number;
    amount_paid: number;
    status: "pending" | "partially_paid" | "paid" | "refunded";
    due_date: string | null;
    paid_at: string | null;
    created_at: string;
    payment_method?: string;
    notes?: string;
    guest?: { name: string } | null;
    booking?: { room?: { number: string } | null } | null;
}

export function useInvoices() {
    return useQuery({
        queryKey: ["invoices"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("invoices")
                .select("*, guest:guests(name), booking:bookings(room:rooms(number))")
                .order("created_at", { ascending: false });

            if (error) throw error;
            return (data || []) as Invoice[];
        },
    });
}

export function useUpdateInvoice() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, updates }: { id: string; updates: Partial<Invoice> }) => {
            // Enforcement: Cannot mark as "paid" if there is a remaining balance
            if (updates.status === "paid") {
                const { data: current } = await supabase.from("invoices").select("amount, amount_paid").eq("id", id).single();
                const totalAmount = updates.amount !== undefined ? updates.amount : current?.amount || 0;
                const paidAmount = updates.amount_paid !== undefined ? updates.amount_paid : current?.amount_paid || 0;

                if (totalAmount > paidAmount) {
                    throw new Error("Cannot set status to 'Paid' while balance is greater than 0.");
                }
            }

            const { data, error } = await supabase
                .from("invoices")
                .update(updates)
                .eq("id", id)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["invoices"] });
            toast({ title: "Invoice updated successfully" });
        },
        onError: (error: any) => {
            toast({ title: "Error updating invoice", description: error.message, variant: "destructive" });
        },
    });
}

/**
 * Requirement 5: Add services to bookings/invoices
 * Logic: Adding a service updates the invoice instantly via DB trigger.
 */
export function useAddService() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (service: {
            booking_id: string;
            invoice_id: string;
            description: string;
            amount: number;
            quantity?: number;
            type?: "food" | "laundry" | "custom";
        }) => {
            const { data, error } = await supabase
                .from("services")
                .insert(service)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            // Invalidate queries so UI reflects updated invoice totals
            queryClient.invalidateQueries({ queryKey: ["invoices"] });
            queryClient.invalidateQueries({ queryKey: ["bookings"] });
            toast({ title: "Service added and invoice updated" });
        },
        onError: (error: any) => {
            toast({ title: "Error adding service", description: error.message, variant: "destructive" });
        },
    });
}
