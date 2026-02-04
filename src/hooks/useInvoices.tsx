import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { mockStore } from "@/lib/mockStore";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

export interface LineItem {
    description: string;
    amount: number;
    quantity: number;
    type: "charge" | "service" | "tax" | "discount";
}

export interface InvoiceUpdate {
    status?: "pending" | "partially_paid" | "paid" | "refunded";
    amount?: number;
    amount_paid?: number;
    line_items?: LineItem[];
    paid_at?: string | null;
}

export interface Invoice {
    id: string;
    invoice_number: string;
    guest_id?: string | null;
    booking_id: string | null;
    amount: number;
    tax?: number;
    total?: number;
    amount_paid?: number;
    status: "pending" | "partially_paid" | "paid" | "refunded";
    due_date: string | null;
    paid_at?: string | null;
    paid_date?: string | null;
    created_at: string;
    payment_method?: string;
    notes?: string;
    guest?: { name: string } | null;
    booking?: { room?: { number: string } | null } | null;
}

export function useInvoices() {
    const { hotelId, role } = useAuth();

    return useQuery({
        queryKey: ["invoices", hotelId],
        queryFn: async () => {
            if (!hotelId) return [];
            return await mockStore.invoices.getAll(hotelId);
        },
        enabled: !!hotelId,
    });
}

export function useCreateInvoice() {
    const queryClient = useQueryClient();
    const { hotelId } = useAuth();

    return useMutation({
        mutationFn: async (invoice: Partial<Invoice>) => {
            if (!hotelId) throw new Error("Hotel ID is required to create an invoice");
            return await mockStore.invoices.create(invoice, hotelId);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["invoices"] });
            toast({ title: "Invoice created successfully" });
        },
        onError: (error: any) => {
            toast({ title: "Error creating invoice", description: error.message, variant: "destructive" });
        },
    });
}

export function useUpdateInvoice() {
    const queryClient = useQueryClient();
    const { hotelId } = useAuth();

    return useMutation({
        mutationFn: async ({ id, updates }: { id: string; updates: Partial<Invoice> }) => {
            // Validation logic
            if (updates.status === "paid" && hotelId) {
                const invoices = await mockStore.invoices.getAll(hotelId);
                const current = invoices.find(inv => inv.id === id);
                const totalAmount = updates.amount !== undefined ? updates.amount : current?.amount || 0;
                const paidAmount = updates.amount_paid !== undefined ? updates.amount_paid : current?.amount_paid || 0;

                if (totalAmount > paidAmount) {
                    throw new Error("Cannot set status to 'Paid' while balance is greater than 0.");
                }
            }

            return await mockStore.invoices.update(id, updates);
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

export function useDeleteInvoice() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            return await mockStore.invoices.delete(id);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["invoices"] });
            toast({ title: "Invoice deleted successfully" });
        },
        onError: (error: any) => {
            toast({ title: "Error deleting invoice", description: error.message, variant: "destructive" });
        },
    });
}

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
            const { hotelId: currentHotelId } = useAuth();
            if (!currentHotelId) throw new Error("Could not determine hotel property context.");

            const invoices = await mockStore.invoices.getAll(currentHotelId);
            const invoice = invoices.find(inv => inv.id === service.invoice_id);
            if (invoice) {
                const newAmount = invoice.amount + (service.amount * (service.quantity || 1));
                await mockStore.invoices.update(service.invoice_id, { amount: newAmount });
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["invoices"] });
            queryClient.invalidateQueries({ queryKey: ["bookings"] });
            toast({ title: "Service added and invoice updated" });
        },
        onError: (error: any) => {
            toast({ title: "Error adding service", description: error.message, variant: "destructive" });
        },
    });
}
