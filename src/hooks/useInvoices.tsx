import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, hotelParams } from "@/lib/api";
import type {
  InvoiceCreateInput,
  InvoiceStatus,
  InvoiceUpdateInput,
  InvoiceWithJoins,
  LineItem,
} from "@/lib/types";
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
      return await api.get<Invoice[]>("/api/invoices", hotelParams(hotelId));
    },
    enabled: !!hotelId,
  });
}

export function useCreateInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (invoice: InvoiceCreateInput) => {
      // The server computes tax (hotel tax_rate, unless overridden) and
      // the authoritative total = amount + tax.
      return await api.post<Invoice>("/api/invoices", invoice);
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

/**
 * Edit an invoice's line items / amounts (Billing Save button) or mark it
 * paid. Paying goes through POST /:id/pay with the remaining balance —
 * never by setting `status: 'paid'` directly, so the server stays the
 * authority on `amount_paid` vs `total`.
 */
export function useUpdateInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: InvoiceUpdate }) => {
      if (updates.status === "paid") {
        const current = await api.get<Invoice>(`/api/invoices/${id}`);
        const remaining =
          Math.round((current.total - current.amount_paid) * 100) / 100;
        if (remaining <= 0) return current;
        return await api.post<Invoice>(`/api/invoices/${id}/pay`, {
          amount: remaining,
          payment_method: updates.payment_method,
        });
      }

      // Line-item / amount edits: the server recomputes total = amount + tax.
      const patch: InvoiceUpdateInput = {};
      if (updates.amount !== undefined) patch.amount = updates.amount;
      if (updates.tax !== undefined) patch.tax = updates.tax;
      if (updates.line_items !== undefined) patch.line_items = updates.line_items;
      if (updates.due_date !== undefined) patch.due_date = updates.due_date;
      if (updates.payment_method !== undefined) patch.payment_method = updates.payment_method;
      if (updates.notes !== undefined) patch.notes = updates.notes;
      return await api.patch<Invoice>(`/api/invoices/${id}`, patch);
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

export function usePayInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, amount, payment_method }: { id: string; amount: number; payment_method?: string }) => {
      return await api.post<Invoice>(`/api/invoices/${id}/pay`, { amount, payment_method });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast({ title: "Payment recorded" });
    },
    onError: (error: unknown) => {
      toast({ title: "Error recording payment", description: toErrorMessage(error), variant: "destructive" });
    },
  });
}

export function useCancelInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      return await api.post<Invoice>(`/api/invoices/${id}/cancel`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast({ title: "Invoice cancelled" });
    },
    onError: (error: unknown) => {
      toast({ title: "Error cancelling invoice", description: toErrorMessage(error), variant: "destructive" });
    },
  });
}

export function useDeleteInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      return await api.del(`/api/invoices/${id}`);
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
