import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { mockStore, type InvoiceCreateInputPublic, type InvoiceWithJoins } from "@/lib/mockStore";
import type { InvoiceStatus, LineItem } from "@/lib/types";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

export type { LineItem, InvoiceStatus } from "@/lib/types";

/** An invoice with its joined booking and guest. */
export type Invoice = InvoiceWithJoins;

export interface InvoiceUpdate {
  status?: InvoiceStatus;
  amount?: number;
  tax?: number;
  total?: number;
  amount_paid?: number;
  line_items?: LineItem[];
  paid_date?: string | null;
  due_date?: string | null;
  payment_method?: string;
  notes?: string;
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "An unknown error occurred";
}

export function useInvoices() {
  const { hotelId } = useAuth();

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
    mutationFn: async (invoice: InvoiceCreateInputPublic) => {
      if (!hotelId) throw new Error("Hotel ID is required to create an invoice");
      return await mockStore.invoices.create(invoice, hotelId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast({ title: "Invoice created successfully" });
    },
    onError: (error: unknown) => {
      toast({ title: "Error creating invoice", description: toErrorMessage(error), variant: "destructive" });
    },
  });
}

export function useUpdateInvoice() {
  const queryClient = useQueryClient();
  const { hotelId } = useAuth();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: InvoiceUpdate }) => {
      // Compare the authoritative total against amount_paid (not amount).
      if (updates.status === "paid" && hotelId) {
        const invoices = await mockStore.invoices.getAll(hotelId);
        const current = invoices.find(inv => inv.id === id);
        const totalAmount = updates.total !== undefined ? updates.total : current?.total ?? 0;
        const paidAmount = updates.amount_paid !== undefined ? updates.amount_paid : current?.amount_paid ?? 0;

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
    onError: (error: unknown) => {
      toast({ title: "Error updating invoice", description: toErrorMessage(error), variant: "destructive" });
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
    onError: (error: unknown) => {
      toast({ title: "Error deleting invoice", description: toErrorMessage(error), variant: "destructive" });
    },
  });
}

export function useAddService() {
  const queryClient = useQueryClient();
  // useAuth() is called at the top level of the hook — never inside mutationFn.
  const { hotelId } = useAuth();

  return useMutation({
    mutationFn: async (service: {
      booking_id: string;
      invoice_id: string;
      description: string;
      amount: number;
      quantity?: number;
      type?: "food" | "laundry" | "custom";
    }) => {
      if (!hotelId) throw new Error("Could not determine hotel property context.");

      const invoices = await mockStore.invoices.getAll(hotelId);
      const invoice = invoices.find(inv => inv.id === service.invoice_id);
      if (!invoice) throw new Error("Invoice not found");

      const quantity = service.quantity || 1;
      const lineAmount = service.amount * quantity;
      const newLine: LineItem = {
        description: service.description,
        amount: lineAmount,
        quantity,
        type: "service",
      };
      const line_items = [...(invoice.line_items ?? []), newLine];
      const amount = invoice.amount + lineAmount;
      // Keep tax consistent: preserve the invoice's existing tax rate
      // (seed data uses 10%); fall back to 10% when there is no rate yet.
      const taxRate = invoice.amount > 0 ? invoice.tax / invoice.amount : 0.1;
      const tax = Math.round(amount * taxRate * 100) / 100;
      const total = amount + tax;

      await mockStore.invoices.update(service.invoice_id, {
        line_items,
        amount,
        tax,
        total,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      toast({ title: "Service added and invoice updated" });
    },
    onError: (error: unknown) => {
      toast({ title: "Error adding service", description: toErrorMessage(error), variant: "destructive" });
    },
  });
}
