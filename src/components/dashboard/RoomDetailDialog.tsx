import { Link } from "react-router-dom";
import { format, parseISO, isValid } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Room, RoomStatus } from "@/lib/types";
import type { BookingWithJoins } from "@/lib/types";
import { useUpdateRoom } from "@/hooks/useRooms";
import { useCurrency } from "@/contexts/AppSettingsContext";
import { formatAndConvert } from "@/utils/currency";
import { StatusBadge } from "./StatusBadge";

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = parseISO(value);
  if (!isValid(date)) return "—";
  return format(date, "MMM d, yyyy");
}

/** Status changes offered for the room's current status. */
function nextActions(status: RoomStatus): Array<{ status: RoomStatus; label: string }> {
  switch (status) {
    case "available":
      return [{ status: "maintenance", label: "Mark maintenance" }];
    case "dirty":
      return [
        { status: "cleaning", label: "Start cleaning" },
        { status: "available", label: "Mark available" },
      ];
    case "cleaning":
      return [
        { status: "available", label: "Mark available" },
        { status: "maintenance", label: "Mark maintenance" },
      ];
    case "maintenance":
      return [{ status: "available", label: "Mark available" }];
    case "occupied":
      return [];
  }
}

interface RoomDetailDialogProps {
  room: Room | null;
  currentBooking: BookingWithJoins | null;
  nextBooking: BookingWithJoins | null;
  /** Staff see details read-only; only owner/manager/super_admin change status. */
  canManageRoom: boolean;
  /** Whether the role may open the Bookings page (staff may not). */
  canBook: boolean;
  onClose: () => void;
}

export function RoomDetailDialog({
  room,
  currentBooking,
  nextBooking,
  canManageRoom,
  canBook,
  onClose,
}: RoomDetailDialogProps) {
  const { currency } = useCurrency();
  const updateRoom = useUpdateRoom();

  return (
    <Dialog open={room !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {room ? `Room ${room.number}` : "Room"}
          </DialogTitle>
        </DialogHeader>
        {room && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              <StatusBadge status={room.status} />
              <Badge variant="outline" className="capitalize">{room.type}</Badge>
              <Badge variant="outline">Floor {room.floor}</Badge>
              <Badge variant="outline">Sleeps {room.capacity}</Badge>
            </div>

            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">Nightly rate</dt>
                <dd className="font-medium">{formatAndConvert(room.price_per_night, currency)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Amenities</dt>
                <dd className="font-medium">
                  {room.amenities.length > 0 ? room.amenities.join(", ") : "—"}
                </dd>
              </div>
            </dl>

            <div className="rounded-lg border border-border p-3 space-y-2 text-sm">
              <p className="font-medium">Current guest</p>
              {currentBooking ? (
                <p className="text-muted-foreground">
                  {currentBooking.guest?.name ?? "Guest"} ·{" "}
                  {currentBooking.booking_number} ·{" "}
                  {formatDate(currentBooking.check_in)} →{" "}
                  {formatDate(currentBooking.check_out)}
                </p>
              ) : (
                <p className="text-muted-foreground">No guest checked in.</p>
              )}
              <p className="font-medium pt-1">Next booking</p>
              {nextBooking ? (
                <p className="text-muted-foreground">
                  {nextBooking.guest?.name ?? "Guest"} ·{" "}
                  {nextBooking.booking_number} · arrives{" "}
                  {formatDate(nextBooking.check_in)}
                </p>
              ) : (
                <p className="text-muted-foreground">No upcoming booking.</p>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {canManageRoom &&
                nextActions(room.status).map((action) => (
                  <Button
                    key={action.status}
                    variant="outline"
                    size="sm"
                    disabled={updateRoom.isPending}
                    onClick={() => {
                      updateRoom.mutate({ id: room.id, status: action.status });
                      onClose();
                    }}
                  >
                    {action.label}
                  </Button>
                ))}
              <Button variant="outline" size="sm" asChild>
                <Link to="/rooms">View in Rooms</Link>
              </Button>
              {canBook && (
                <Button size="sm" asChild>
                  <Link to="/bookings">New booking</Link>
                </Button>
              )}
            </div>
            {room.status === "occupied" && canManageRoom && (
              <p className="text-xs text-muted-foreground">
                The room is occupied — change its status after the guest checks
                out (check-out marks it dirty automatically).
              </p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
