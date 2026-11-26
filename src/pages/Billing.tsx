import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Trash2,
  Save,
  Loader2,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Mail,
  Printer
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useGuests } from "@/hooks/useGuests";
import { useBookings } from "@/hooks/useBookings";
import { Card, CardContent } from "@/components/ui/card";
import { useCurrency } from "@/contexts/AppSettingsContext";
import { formatAndConvert } from "@/utils/currency";
import { useAuth } from "@/hooks/useAuth";
import { useHotel } from "@/hooks/useHotels";
import { format } from "date-fns";
import { useInvoices, useCreateInvoice, useUpdateInvoice, useDeleteInvoice, type Invoice, type LineItem } from "@/hooks/useInvoices";

/** Tax rate applied to invoice line-item subtotals (matches the 10% seed data). */
const TAX_RATE = 0.1;

/** Tax on a subtotal, rounded to cents. */
const calculateTax = (subtotal: number): number =>
  Math.round(subtotal * TAX_RATE * 100) / 100;

export default function Billing() {
  const { data: invoices = [], isLoading } = useInvoices();
  const { data: guests = [] } = useGuests();
  const { data: bookings = [] } = useBookings();
  const createInvoice = useCreateInvoice();
  const updateInvoice = useUpdateInvoice();
  const deleteInvoice = useDeleteInvoice();
  const { currency } = useCurrency();


  // Wizard State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const [formData, setFormData] = useState({
    guest_id: "",
    booking_id: "",
    amount: "0",
    line_items: [] as LineItem[],
  });

  const { hotelId } = useAuth();

  const [isEmailing, setIsEmailing] = useState(false);

  // Hotel record from the API, for the invoice preview header.
  const { data: hotel } = useHotel(hotelId === "global" ? null : hotelId);

  const handlePrint = () => {
    setIsPreviewOpen(true);
    setTimeout(() => {
      window.print();
    }, 500);
  };

  const handleEmail = async (invoice: Invoice) => {
    if (!invoice.guest?.email) {
      toast({ title: "Recipient missing", description: "This invoice is not linked to a guest with an email address.", variant: "destructive" });
      return;
    }

    setIsEmailing(true);
    toast({
      title: "Generating PDF...",
      description: `Preparing invoice #${invoice.invoice_number} for delivery.`,
    });

    // Simulate PDF generation and transport (no real email is sent).
    await new Promise(r => setTimeout(r, 2000));

    setIsEmailing(false);
    toast({
      title: "Invoice Sent Successfully",
      description: `A PDF version of invoice ${invoice.invoice_number} has been sent to ${invoice.guest.email}.`,
    });
  };


  // All invoices are visible to every role — no date restriction.
  const filteredInvoices = invoices;

  // Revenue is computed from the authoritative total (total = amount + tax).
  const totalRevenue = filteredInvoices.filter((i) => i.status === "paid").reduce((sum, i) => sum + i.total, 0);
  const pendingRevenue = filteredInvoices
    .filter((i) => i.status === "pending" || i.status === "partially_paid")
    .reduce((sum, i) => sum + Math.max(0, i.total - (i.amount_paid ?? 0)), 0);

  // Auto-fill logic when Guest is selected
  useEffect(() => {
    if (formData.guest_id && wizardStep === 1) {
      // Find active booking for this guest
      const activeBooking = bookings.find(b =>
        b.guest_id === formData.guest_id &&
        (b.status === 'confirmed' || b.status === 'checked_in')
      );

      if (activeBooking) {
        // Here we default to creating an invoice for the FULL REMAINING Amount
        // Assuming current invoice covers remaining balance.
        const paid = activeBooking.deposit_amount || 0;
        const outstanding = Math.max(0, activeBooking.total_amount - paid);

        setFormData(prev => ({
          ...prev,
          booking_id: activeBooking.id,
          amount: outstanding.toString(),
          line_items: outstanding > 0 ? [{
            description: `Room Charge Balance (Book #${activeBooking.booking_number})`,
            amount: outstanding,
            quantity: 1,
            type: "charge"
          }] : []
        }));
      } else {
        setFormData(prev => ({ ...prev, booking_id: "", amount: "0", line_items: [] }));
      }
    }
  }, [formData.guest_id, bookings, wizardStep]);


  // ---- Invoice Editor Logic (Shared) ----
  const handleAddLineItem = (targetLines: LineItem[] | null | undefined, setLines: (l: LineItem[]) => void) => {
    const newItem: LineItem = { description: "New Service", amount: 0, quantity: 1, type: "service" };
    setLines([...(targetLines ?? []), newItem]);
  };

  const handleUpdateLineItem = (index: number, field: keyof LineItem, value: string | number, targetLines: LineItem[] | null | undefined, setLines: (l: LineItem[]) => void) => {
    const updated = [...(targetLines ?? [])];
    if (!updated[index]) return;
    updated[index] = { ...updated[index], [field]: value };
    setLines(updated);
  };

  const handleRemoveLineItem = (index: number, targetLines: LineItem[] | null | undefined, setLines: (l: LineItem[]) => void) => {
    setLines((targetLines ?? []).filter((_, i) => i !== index));
  };

  // Calculate the line-item subtotal from lines (defensive: lines may be missing).
  const calculateTotal = (lines: LineItem[] | null | undefined) =>
    (lines ?? []).reduce((sum, item) => sum + ((item.amount ?? 0) * (item.quantity ?? 1)), 0);

  // ---- Handlers ----

  const handleWizardSubmit = async () => {
    const finalAmount = calculateTotal(formData.line_items);
    const finalTax = calculateTax(finalAmount);
    await createInvoice.mutateAsync({
      guest_id: formData.guest_id || undefined,
      booking_id: formData.booking_id || undefined,
      amount: finalAmount,
      tax: finalTax,
      line_items: formData.line_items ?? [],
      status: "pending"
    });
    setIsDialogOpen(false);
    resetWizard();
  };

  const resetWizard = () => {
    setWizardStep(1);
    setFormData({ guest_id: "", booking_id: "", amount: "0", line_items: [] });
  };

  const handleDeleteInvoice = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this invoice?")) {
      await deleteInvoice.mutateAsync(id);
      if (selectedInvoice?.id === id) setSelectedInvoice(null);
    }
  };


  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  // Helper to determine badge color for partial payment
  const getStatusBadge = (inv: Invoice) => {
    const isPaid = inv.status === 'paid';
    const isPartial = !isPaid && (inv.amount_paid > 0);

    if (isPaid) return <StatusBadge status="success" label="Paid" />;
    if (isPartial) return <StatusBadge status="warning" label="Partial" />;
    return <StatusBadge status="pending" label="Pending" />;
  };

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Billing & Invoices</h1>
            <p className="text-muted-foreground">Manage payments and edit invoices</p>
          </div>
          <div className="flex gap-2">
            <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetWizard(); }}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" /> Create Invoice
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create Invoice - Step {wizardStep} of 2</DialogTitle>
                </DialogHeader>

                {wizardStep === 1 && (
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Select Guest</Label>
                      <Select
                        value={formData.guest_id}
                        onValueChange={(v) => setFormData({ ...formData, guest_id: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Search guest..." />
                        </SelectTrigger>
                        <SelectContent className="max-h-[200px]">
                          {guests.map(g => (
                            <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {formData.guest_id && (
                      <div className="bg-muted/50 p-4 rounded-md border">
                        {formData.booking_id ? (
                          <div className="flex items-start gap-3">
                            <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                            <div>
                              <p className="font-semibold text-sm">Active Booking Found</p>
                              <p className="text-sm text-muted-foreground">
                                Linked to Booking ID: {bookings.find(b => b.id === formData.booking_id)?.booking_number}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                Outstanding Balance: <span className="font-mono text-foreground font-medium">{formatAndConvert(parseFloat(formData.amount), currency)}</span>
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-start gap-3">
                            <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5" />
                            <div>
                              <p className="font-semibold text-sm">No Active Booking</p>
                              <p className="text-sm text-muted-foreground">
                                You can still create a general invoice for this guest.
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    <DialogFooter>
                      <Button onClick={() => setWizardStep(2)} disabled={!formData.guest_id}>
                        Continue <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </DialogFooter>
                  </div>
                )}

                {wizardStep === 2 && (
                  <div className="space-y-4 py-4">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-semibold text-sm">Add Services & Items</h4>
                      <Button size="sm" variant="ghost" onClick={() => handleAddLineItem(formData.line_items, (l) => setFormData({ ...formData, line_items: l }))}>
                        <Plus className="h-4 w-4" /> Add Item
                      </Button>
                    </div>

                    <div className="border rounded-md max-h-[300px] overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Description</TableHead>
                            <TableHead className="w-[80px]">Qty</TableHead>
                            <TableHead className="w-[100px]">Amount</TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {formData.line_items.length === 0 && (
                            <TableRow>
                              <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                                No items added. Click "Add Item" to start.
                              </TableCell>
                            </TableRow>
                          )}
                          {formData.line_items.map((item, idx) => (
                            <TableRow key={idx}>
                              <TableCell>
                                <Input
                                  value={item.description}
                                  onChange={e => handleUpdateLineItem(idx, 'description', e.target.value, formData.line_items, (l) => setFormData({ ...formData, line_items: l }))}
                                  className="h-8"
                                  placeholder="e.g. Laundry"
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  value={item.quantity}
                                  onChange={e => handleUpdateLineItem(idx, 'quantity', parseFloat(e.target.value), formData.line_items, (l) => setFormData({ ...formData, line_items: l }))}
                                  className="h-8"
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  value={item.amount}
                                  onChange={e => handleUpdateLineItem(idx, 'amount', parseFloat(e.target.value), formData.line_items, (l) => setFormData({ ...formData, line_items: l }))}
                                  className="h-8"
                                />
                              </TableCell>
                              <TableCell>
                                <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => handleRemoveLineItem(idx, formData.line_items, (l) => setFormData({ ...formData, line_items: l }))}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    <div className="space-y-1 text-sm text-muted-foreground">
                      <div className="flex justify-between">
                        <span>Subtotal</span>
                        <span>{formatAndConvert(calculateTotal(formData.line_items), currency)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Tax (10%)</span>
                        <span>{formatAndConvert(calculateTax(calculateTotal(formData.line_items)), currency)}</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center bg-muted/30 p-3 rounded-lg">
                      <span className="font-semibold">Total Amount</span>
                      <span className="text-xl font-bold">{formatAndConvert(calculateTotal(formData.line_items) + calculateTax(calculateTotal(formData.line_items)), currency)}</span>
                    </div>

                    <DialogFooter className="flex justify-between w-full sm:justify-between">
                      <Button variant="outline" onClick={() => setWizardStep(1)}>
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back
                      </Button>
                      <Button onClick={handleWizardSubmit} disabled={createInvoice.isPending}>
                        {createInvoice.isPending ? <Loader2 className="animate-spin h-4 w-4" /> : <><Save className="mr-2 h-4 w-4" /> Create Invoice</>}
                      </Button>
                    </DialogFooter>
                  </div>
                )}

              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 flex flex-col justify-center">
              <span className="text-muted-foreground text-sm">
                Total Collected
              </span>
              <span className="text-2xl font-bold text-green-600">{formatAndConvert(totalRevenue, currency)}</span>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex flex-col justify-center">
              <span className="text-muted-foreground text-sm">
                Total Pending
              </span>
              <span className="text-2xl font-bold text-orange-600">{formatAndConvert(pendingRevenue, currency)}</span>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Invoice List */}
          <div className={`glass-card overflow-hidden ${selectedInvoice ? 'lg:col-span-1' : 'lg:col-span-3'}`}>
            <div className="p-4 border-b font-semibold">Invoices</div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Num</TableHead>
                  <TableHead>Guest</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-center">Paid</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map(inv => (
                  <TableRow
                    key={inv.id}
                    className={`cursor-pointer hover:bg-muted/50 ${selectedInvoice?.id === inv.id ? 'bg-muted' : ''}`}
                    onClick={() => setSelectedInvoice(inv)}
                  >
                    <TableCell className="font-mono">{inv.invoice_number}</TableCell>
                    <TableCell>{inv.guest?.name || 'Unknown'}</TableCell>
                    <TableCell className="text-right">{formatAndConvert(inv.total, currency)}</TableCell>

                    {/* New: Showing Amount Paid */}
                    <TableCell className="text-center text-muted-foreground">
                      {inv.amount_paid > 0 ? <span className="text-green-600 font-medium">{formatAndConvert(inv.amount_paid, currency)}</span> : '-'}
                    </TableCell>

                    <TableCell>{getStatusBadge(inv)}</TableCell>
                    <TableCell>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={(e) => handleDeleteInvoice(inv.id, e)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Invoice Editor (Viewing/Editing Existing) */}
          {selectedInvoice && (
            <div className="lg:col-span-2 glass-card p-4 animate-in slide-in-from-right">
              <div className="flex justify-between items-center mb-4 border-b pb-2">
                <div>
                  <h3 className="text-lg font-bold">{selectedInvoice.invoice_number}</h3>
                  <p className="text-sm text-muted-foreground">Guest: {selectedInvoice.guest?.name}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="gap-2" onClick={() => handleEmail(selectedInvoice)}>
                    <Mail className="h-4 w-4" /> Email
                  </Button>
                  <Button size="sm" variant="outline" className="gap-2" onClick={() => setIsPreviewOpen(true)}>
                    <Printer className="h-4 w-4" /> Preview
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setSelectedInvoice(null)}>Cancel</Button>

                  <Button size="sm" onClick={() => {
                    const subtotal = calculateTotal(selectedInvoice.line_items);
                    const tax = calculateTax(subtotal);
                    updateInvoice.mutate({
                      id: selectedInvoice.id,
                      updates: {
                        line_items: selectedInvoice.line_items ?? [],
                        amount: subtotal,
                        tax,
                        total: subtotal + tax
                      }
                    });
                    setSelectedInvoice(null);
                  }} disabled={updateInvoice.isPending}>
                    <Save className="h-4 w-4 mr-1" /> Save
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center bg-muted/30 p-2 rounded">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">Status:</span>
                    {getStatusBadge(selectedInvoice)}
                  </div>
                  {selectedInvoice.status !== 'paid' && (
                    <Button size="sm" variant="default" onClick={() => {
                      // Mark as fully paid -> set Amount Paid = Total Amount
                      updateInvoice.mutate({
                        id: selectedInvoice.id,
                        updates: {
                          status: 'paid',
                          amount_paid: selectedInvoice.total,
                          paid_date: new Date().toISOString()
                        }
                      });
                      setSelectedInvoice(null);
                    }}>Mark as Fully Paid</Button>
                  )}
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-semibold text-sm">Line Items</h4>
                    <Button size="sm" variant="ghost" onClick={() => handleAddLineItem(selectedInvoice.line_items, (l) => setSelectedInvoice({ ...selectedInvoice, line_items: l }))}>
                      <Plus className="h-4 w-4" /> Add Item
                    </Button>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Description</TableHead>
                        <TableHead className="w-[80px]">Qty</TableHead>
                        <TableHead className="w-[100px]">Amount</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(selectedInvoice.line_items || []).map((item, idx) => (
                        <TableRow key={idx}>
                          <TableCell>
                            <Input
                              value={item.description}
                              onChange={e => handleUpdateLineItem(idx, 'description', e.target.value, selectedInvoice.line_items, (l) => setSelectedInvoice({ ...selectedInvoice, line_items: l }))}
                              className="h-8"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={item.quantity}
                              onChange={e => handleUpdateLineItem(idx, 'quantity', parseFloat(e.target.value), selectedInvoice.line_items, (l) => setSelectedInvoice({ ...selectedInvoice, line_items: l }))}
                              className="h-8"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={item.amount}
                              onChange={e => handleUpdateLineItem(idx, 'amount', parseFloat(e.target.value), selectedInvoice.line_items, (l) => setSelectedInvoice({ ...selectedInvoice, line_items: l }))}
                              className="h-8"
                            />
                          </TableCell>
                          <TableCell>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => handleRemoveLineItem(idx, selectedInvoice.line_items, (l) => setSelectedInvoice({ ...selectedInvoice, line_items: l }))}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex flex-col gap-2 pt-4 border-t">
                  <div className="flex justify-between items-center text-muted-foreground">
                    <span>Subtotal</span>
                    <span>{formatAndConvert(calculateTotal(selectedInvoice.line_items), currency)}</span>
                  </div>
                  <div className="flex justify-between items-center text-muted-foreground">
                    <span>Tax (10%)</span>
                    <span>{formatAndConvert(calculateTax(calculateTotal(selectedInvoice.line_items)), currency)}</span>
                  </div>
                  <div className="flex justify-between items-center text-muted-foreground">
                    <span>Total Bill</span>
                    <span>{formatAndConvert(calculateTotal(selectedInvoice.line_items) + calculateTax(calculateTotal(selectedInvoice.line_items)), currency)}</span>
                  </div>
                  {selectedInvoice.amount_paid > 0 && (
                    <div className="flex justify-between items-center text-green-600">
                      <span>Paid (Advance/Deposit)</span>
                      <span>- {formatAndConvert(selectedInvoice.amount_paid, currency)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center pt-2 border-t mt-2">
                    <span className="font-bold text-lg">Remaining Due</span>
                    <span className="font-bold text-2xl">
                      {formatAndConvert(Math.max(0, calculateTotal(selectedInvoice.line_items) + calculateTax(calculateTotal(selectedInvoice.line_items)) - (selectedInvoice.amount_paid ?? 0)), currency)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        {/* Invoice Preview Dialog */}
        <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader className="print:hidden">
              <DialogTitle>Invoice Preview</DialogTitle>
            </DialogHeader>
            {selectedInvoice && (
              <div id="printable-invoice" className="bg-white text-black p-8 rounded-lg shadow-inner">
                <div className="flex justify-between items-start border-b pb-6 mb-6">
                  <div>
                    <h2 className="text-3xl font-bold text-primary">INVOICE</h2>
                    <p className="text-sm text-gray-500 mt-1"># {selectedInvoice.invoice_number}</p>
                  </div>
                  <div className="text-right">
                    <h3 className="font-bold">{hotel?.name ?? "Grand Plaza Hotel"}</h3>
                    <p className="text-sm text-gray-500">{hotel?.location ?? "Dubai, UAE"}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-8 mb-8">
                  <div>
                    <h4 className="text-xs font-bold uppercase text-gray-400 mb-2">Bill To</h4>
                    <p className="font-bold text-lg">{selectedInvoice.guest?.name}</p>
                    <p className="text-sm text-gray-600">Guest ID: {selectedInvoice.guest_id?.slice(0, 8)}</p>
                  </div>
                  <div className="text-right">
                    <h4 className="text-xs font-bold uppercase text-gray-400 mb-2">Invoice Date</h4>
                    <p className="font-bold">{format(new Date(selectedInvoice.created_at), "MMMM dd, yyyy")}</p>
                    <h4 className="text-xs font-bold uppercase text-gray-400 mt-4 mb-2">Status</h4>
                    <p className={`font-bold uppercase ${selectedInvoice.status === 'paid' ? 'text-green-600' : 'text-orange-600'}`}>
                      {selectedInvoice.status}
                    </p>
                  </div>
                </div>

                <table className="w-full mb-8">
                  <thead>
                    <tr className="border-b-2 border-gray-100 italic">
                      <th className="text-left py-3 font-semibold">Description</th>
                      <th className="text-center py-3 font-semibold w-20">Qty</th>
                      <th className="text-right py-3 font-semibold w-32">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedInvoice.line_items || []).map((item, idx) => (
                      <tr key={idx} className="border-b border-gray-50">
                        <td className="py-4 text-gray-800">{item.description}</td>
                        <td className="py-4 text-center text-gray-600">{item.quantity}</td>
                        <td className="py-4 text-right font-medium">{formatAndConvert(item.amount, currency)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="flex justify-end">
                  <div className="w-64 space-y-3">
                    <div className="flex justify-between text-gray-500">
                      <span>Subtotal</span>
                      <span>{formatAndConvert(calculateTotal(selectedInvoice.line_items), currency)}</span>
                    </div>
                    <div className="flex justify-between text-gray-500">
                      <span>Tax (10%)</span>
                      <span>{formatAndConvert(calculateTax(calculateTotal(selectedInvoice.line_items)), currency)}</span>
                    </div>
                    <div className="flex justify-between text-gray-500">
                      <span>Total</span>
                      <span>{formatAndConvert(calculateTotal(selectedInvoice.line_items) + calculateTax(calculateTotal(selectedInvoice.line_items)), currency)}</span>
                    </div>
                    {selectedInvoice.amount_paid > 0 && (
                      <div className="flex justify-between text-green-600 font-medium">
                        <span>Paid Amount</span>
                        <span>- {formatAndConvert(selectedInvoice.amount_paid, currency)}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center pt-3 border-t-2 border-gray-200">
                      <span className="font-bold text-lg text-gray-900">Total Due</span>
                      <span className="font-bold text-2xl text-primary">
                        {formatAndConvert(Math.max(0, calculateTotal(selectedInvoice.line_items) + calculateTax(calculateTotal(selectedInvoice.line_items)) - (selectedInvoice.amount_paid ?? 0)), currency)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-12 text-center text-xs text-gray-400 italic">
                  Thank you for choosing {hotel?.name ?? "Grand Plaza Hotel"}. Please keep this invoice for your records.
                </div>
              </div>
            )}
            <DialogFooter className="print:hidden mt-6">
              <Button variant="outline" onClick={() => setIsPreviewOpen(false)}>Close Preview</Button>
              <Button variant="outline" className="gap-2" onClick={() => { if (selectedInvoice) handleEmail(selectedInvoice); }} disabled={isEmailing}>
                {isEmailing ? <Loader2 className="animate-spin h-4 w-4" /> : <Mail className="h-4 w-4" />}
                Send to Guest Email
              </Button>
              <Button onClick={() => window.print()} className="gap-2">
                <Printer className="h-4 w-4" /> Print PDF
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
