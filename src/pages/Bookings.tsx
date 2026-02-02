import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, Search, MoreHorizontal, LogIn, LogOut, XCircle, FileText, Loader2, DollarSign, Trash2 } from "lucide-react";
import { useBookings, useCreateBooking, useUpdateBooking, useUpdateBookingStatus, useDeleteBooking, BookingStatus } from "@/hooks/useBookings";
import { useRealtimeBookings } from "@/hooks/useActivity";
import { useRooms } from "@/hooks/useRooms";
import { useGuests, useCreateGuest } from "@/hooks/useGuests";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useCurrency } from "@/contexts/AppSettingsContext";
import { formatAndConvert } from "@/utils/currency";

export default function Bookings() {
  useRealtimeBookings();
  const { data: bookings = [], isLoading } = useBookings();
  const { data: rooms = [] } = useRooms();
  const { data: guests = [] } = useGuests();
  const createBooking = useCreateBooking();
  const updateBooking = useUpdateBooking();
  const deleteBooking = useDeleteBooking();
  const createGuest = useCreateGuest();
  const updateStatus = useUpdateBookingStatus();
  const { currency } = useCurrency();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [paymentMode, setPaymentMode] = useState<"pay_now" | "deposit" | "pay_later">("pay_later");
  const [formData, setFormData] = useState({
    guestName: "",
    guestEmail: "",
    guestPhone: "",
    roomId: "",
    checkIn: "",
    checkOut: "",
    depositAmount: "",
    guestType: "national" as "national" | "international",
  });

  const handleOpenDialog = (booking?: any) => {
    if (booking) {
      setEditingBooking(booking);
      setFormData({
        guestName: booking.guest?.name || "",
        guestEmail: booking.guest?.email || "",
        guestPhone: booking.guest?.phone || "",
        roomId: booking.room_id || "",
        checkIn: booking.check_in,
        checkOut: booking.check_out,
        depositAmount: booking.deposit_amount?.toString() || "",
        guestType: booking.guest_type || "national",
      });
      setPaymentMode(booking.payment_status === "paid" ? "pay_now" : (booking.deposit_amount > 0 ? "deposit" : "pay_later"));
    } else {
      setEditingBooking(null);
      setFormData({ guestName: "", guestEmail: "", guestPhone: "", roomId: "", checkIn: "", checkOut: "", depositAmount: "", guestType: "national" });
      setPaymentMode("pay_later");
    }
    setIsDialogOpen(true);
  };

  const availableRooms = rooms.filter((r) => r.status === "available" || (editingBooking && r.id === editingBooking.room_id));

  const selectedRoom = rooms.find(r => r.id === formData.roomId);
  const nights = formData.checkIn && formData.checkOut
    ? Math.max(1, Math.ceil((new Date(formData.checkOut).getTime() - new Date(formData.checkIn).getTime()) / (1000 * 60 * 60 * 24)))
    : 0;
  const totalAmount = selectedRoom ? selectedRoom.rate * nights : 0;

  const handleDeleteBooking = async (id: string) => {
    if (confirm("Are you sure you want to delete this booking? This action cannot be undone.")) {
      deleteBooking.mutate(id);
    }
  };

  const handleStatusChange = async (id: string, status: BookingStatus) => {
    updateStatus.mutate({ id, status });
  };

  const handleSaveBooking = async () => {
    try {
      if (editingBooking) {
        await updateBooking.mutateAsync({
          id: editingBooking.id,
          check_in: formData.checkIn,
          check_out: formData.checkOut,
          room_id: formData.roomId,
          total_amount: totalAmount,
        });
      } else {
        let customerId = "";
        // @ts-ignore
        const { data: existingCustomers } = await supabase
          .from("guests")
          .select("id")
          .or(`phone.eq.${formData.guestPhone},email.eq.${formData.guestEmail}`)
          .limit(1);

        if (existingCustomers && existingCustomers.length > 0) {
          customerId = existingCustomers[0].id;
        } else {
          const newCustomer = await createGuest.mutateAsync({
            name: formData.guestName,
            email: formData.guestEmail || null,
            phone: formData.guestPhone || null,
            tags: ["regular"],
            notes: null,
          });
          customerId = newCustomer.id;
        }

        let deposit = 0;
        let paymentStatus = "pending";

        if (paymentMode === "pay_now") {
          deposit = totalAmount;
          paymentStatus = "paid";
        } else if (paymentMode === "deposit") {
          deposit = parseFloat(formData.depositAmount) || 0;
          paymentStatus = "partially_paid";
        }

        const booking = await createBooking.mutateAsync({
          guest_id: customerId,
          room_id: formData.roomId,
          check_in: formData.checkIn,
          check_out: formData.checkOut,
          total_amount: totalAmount,
          status: "confirmed",
          guest_type: formData.guestType,
          payment_status: paymentStatus,
          deposit_amount: deposit
        });

        const invoiceNum = `INV-${Date.now()}`;
        let amountPaid = paymentMode === "pay_now" ? totalAmount : (paymentMode === "deposit" ? deposit : 0);

        // @ts-ignore
        await supabase.from("invoices").insert({
          invoice_number: invoiceNum,
          booking_id: booking.id,
          guest_id: customerId,
          amount: totalAmount,
          amount_paid: amountPaid,
          status: paymentMode === "pay_now" ? "paid" : "pending",
          paid_at: amountPaid > 0 ? new Date().toISOString() : null,
          payment_method: amountPaid > 0 ? "cash" : null,
          notes: `Booking Charge (${nights} nights). Mode: ${paymentMode}`,
          line_items: [{
            description: `Room Charge (${selectedRoom?.type} - ${nights} nights)`,
            amount: totalAmount,
            quantity: 1,
            type: "charge"
          }]
        });
      }

      setIsDialogOpen(false);
      setEditingBooking(null);
      setFormData({ guestName: "", guestEmail: "", guestPhone: "", roomId: "", checkIn: "", checkOut: "", depositAmount: "", guestType: "national" });
      toast({ title: editingBooking ? "Booking updated successfully" : "Booking created successfully" });

    } catch (error: any) {
      console.error("Booking operation error:", error);
      toast({
        title: "Failed to process booking",
        description: error.message || "Unknown error occurred",
        variant: "destructive"
      });
    }
  };

  const filteredBookings = bookings.filter(
    (b) =>
      b.booking_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.guest?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.room?.number?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const statusCounts = bookings.reduce((acc, b) => {
    const status = b.status.replace("_", "-") as string;
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const mapStatus = (status: BookingStatus): "confirmed" | "pending" | "checked-in" | "checked-out" | "cancelled" => {
    const statusMap: Record<BookingStatus, "confirmed" | "pending" | "checked-in" | "checked-out" | "cancelled"> = {
      pending: "pending",
      confirmed: "confirmed",
      checked_in: "checked-in",
      checked_out: "checked-out",
      cancelled: "cancelled",
    };
    return statusMap[status];
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

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Bookings</h1>
            <p className="text-muted-foreground">
              Manage reservations and track booking lifecycle
            </p>
          </div>
          <Button className="gap-2" onClick={() => handleOpenDialog()}>
            <Plus className="h-4 w-4" />
            New Booking
          </Button>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>{editingBooking ? "Edit Booking" : "Create New Booking"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto">
              <div className="space-y-2">
                <Label>Customer Name (Booker) *</Label>
                <Input
                  placeholder="John Smith"
                  value={formData.guestName}
                  onChange={(e) => setFormData({ ...formData, guestName: e.target.value })}
                  disabled={!!editingBooking}
                />
                {!editingBooking && <p className="text-xs text-muted-foreground">This creates a CRM entry or reuses existing if phone matches.</p>}
              </div>
              {!editingBooking && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      placeholder="guest@email.com"
                      value={formData.guestEmail}
                      onChange={(e) => setFormData({ ...formData, guestEmail: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input
                      placeholder="+1234567890"
                      value={formData.guestPhone}
                      onChange={(e) => setFormData({ ...formData, guestPhone: e.target.value })}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-3 pt-2">
                <Label>Guest Classification *</Label>
                <RadioGroup
                  value={formData.guestType}
                  onValueChange={(v: any) => setFormData({ ...formData, guestType: v })}
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="national" id="national" />
                    <Label htmlFor="national">National (Local)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="international" id="international" />
                    <Label htmlFor="international">International (VIP)</Label>
                  </div>
                </RadioGroup>
                <p className="text-xs text-muted-foreground">International guests are automatically classified as VIP.</p>
              </div>

              <div className="border-t pt-4 mt-2">
                <h3 className="font-semibold mb-3">Room & Dates</h3>
                <div className="space-y-2 mb-3">
                  <Label>Select Room *</Label>
                  <Select
                    value={formData.roomId}
                    onValueChange={(v) => setFormData({ ...formData, roomId: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select room" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableRooms.map((room) => (
                        <SelectItem key={room.id} value={room.id}>
                          Room {room.number} - {room.type} ({formatAndConvert(room.rate, currency)}/night)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Check-in *</Label>
                    <Input
                      type="date"
                      value={formData.checkIn}
                      onChange={(e) => setFormData({ ...formData, checkIn: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Check-out *</Label>
                    <Input
                      type="date"
                      value={formData.checkOut}
                      onChange={(e) => setFormData({ ...formData, checkOut: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {totalAmount > 0 && !editingBooking && (
                <div className="bg-muted/30 p-3 rounded-md border border-border">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-muted-foreground">{nights} nights x {formatAndConvert(selectedRoom?.rate || 0, currency)}</span>
                    <span className="font-bold text-lg">{formatAndConvert(totalAmount, currency)}</span>
                  </div>

                  <div className="space-y-3 pt-2 border-t border-border">
                    <Label>Payment Mode</Label>
                    <RadioGroup value={paymentMode} onValueChange={(v: any) => setPaymentMode(v)} className="flex flex-col gap-2">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="pay_later" id="later" />
                        <Label htmlFor="later">Pay at Checkout</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="pay_now" id="full" />
                        <Label htmlFor="full">Full Pre-payment ({formatAndConvert(totalAmount, currency)})</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="deposit" id="deposit" />
                        <Label htmlFor="deposit">Partial Deposit</Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {paymentMode === "deposit" && (
                    <div className="mt-3">
                      <Label>Deposit Amount</Label>
                      <div className="relative mt-1">
                        <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          type="number"
                          className="pl-8"
                          placeholder="50.00"
                          value={formData.depositAmount}
                          onChange={(e) => setFormData({ ...formData, depositAmount: e.target.value })}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              <Button
                onClick={handleSaveBooking}
                disabled={createBooking.isPending || updateBooking.isPending || !formData.guestName || !formData.roomId || !formData.checkIn || !formData.checkOut}
                className="w-full mt-2"
              >
                {createBooking.isPending || updateBooking.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : (editingBooking ? "Update Booking" : `Confirm Booking (${formatAndConvert(paymentMode === "pay_now" ? totalAmount : (paymentMode === "deposit" ? parseFloat(formData.depositAmount) || 0 : 0), currency)} Paid)`)}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <div className="glass-card p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by guest name, booking ID, or room..."
              className="pl-10 bg-muted/50 border-0"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { status: "confirmed" as const, count: statusCounts["confirmed"] || 0 },
            { status: "pending" as const, count: statusCounts["pending"] || 0 },
            { status: "checked-in" as const, count: statusCounts["checked-in"] || 0 },
            { status: "checked-out" as const, count: statusCounts["checked-out"] || 0 },
            { status: "cancelled" as const, count: statusCounts["cancelled"] || 0 },
          ].map((item) => (
            <button
              key={item.status}
              className="glass-card p-3 text-left hover:border-primary/30 transition-colors"
            >
              <StatusBadge status={item.status} size="sm" />
              <p className="text-xl font-bold mt-2">{item.count}</p>
            </button>
          ))}
        </div>

        <div className="glass-card overflow-hidden">
          {filteredBookings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                <FileText className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No bookings yet</h3>
              <p className="text-muted-foreground text-sm max-w-sm">
                Bookings will appear here once you create them. Click "New Booking" to get started.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-border">
                  <TableHead className="text-muted-foreground">Booking ID</TableHead>
                  <TableHead className="text-muted-foreground">Guest</TableHead>
                  <TableHead className="text-muted-foreground">Room</TableHead>
                  <TableHead className="text-muted-foreground">Check-in</TableHead>
                  <TableHead className="text-muted-foreground">Check-out</TableHead>
                  <TableHead className="text-muted-foreground">Status</TableHead>
                  <TableHead className="text-muted-foreground text-right">Amount</TableHead>
                  <TableHead className="text-muted-foreground w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBookings.map((booking) => (
                  <TableRow key={booking.id} className="border-border hover:bg-muted/30">
                    <TableCell className="font-mono text-sm">{booking.booking_number}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium flex items-center gap-2">
                          {booking.guest?.name || "N/A"}
                          {booking.guest?.tags?.includes('vip') && (
                            <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider border border-amber-200">
                              VIP
                            </span>
                          )}
                        </span>
                        <span className="text-xs text-muted-foreground capitalize">{booking.guest_type}</span>
                      </div>
                    </TableCell>
                    <TableCell>Room {booking.room?.number || "N/A"}</TableCell>
                    <TableCell>{format(new Date(booking.check_in), "MMM dd, yyyy")}</TableCell>
                    <TableCell>{format(new Date(booking.check_out), "MMM dd, yyyy")}</TableCell>
                    <TableCell>
                      <StatusBadge status={mapStatus(booking.status)} />
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatAndConvert(Number(booking.total_amount), currency)}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            className="gap-2"
                            onClick={() => handleOpenDialog(booking)}
                          >
                            <FileText className="h-4 w-4" />
                            Edit Details
                          </DropdownMenuItem>
                          {booking.status === "confirmed" && (
                            <DropdownMenuItem
                              className="gap-2"
                              onClick={() => handleStatusChange(booking.id, "checked_in")}
                            >
                              <LogIn className="h-4 w-4" />
                              Check In
                            </DropdownMenuItem>
                          )}
                          {booking.status === "checked_in" && (
                            <DropdownMenuItem
                              className="gap-2"
                              onClick={() => handleStatusChange(booking.id, "checked_out")}
                            >
                              <LogOut className="h-4 w-4" />
                              Check Out
                            </DropdownMenuItem>
                          )}
                          {(booking.status === "pending" || booking.status === "confirmed") && (
                            <DropdownMenuItem
                              className="gap-2 text-orange-600"
                              onClick={() => handleStatusChange(booking.id, "cancelled")}
                            >
                              <XCircle className="h-4 w-4" />
                              Cancel
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            className="gap-2 text-destructive"
                            onClick={() => handleDeleteBooking(booking.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
