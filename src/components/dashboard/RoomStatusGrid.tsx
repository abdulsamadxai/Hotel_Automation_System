import type { Room, RoomStatus } from "@/lib/types";
import { StatusBadge } from "./StatusBadge";

const ALL_STATUSES: RoomStatus[] = [
  "available",
  "occupied",
  "dirty",
  "cleaning",
  "maintenance",
];

const statusColors: Record<RoomStatus, string> = {
  available: "border-room-available bg-room-available/10 hover:bg-room-available/20",
  occupied: "border-room-occupied bg-room-occupied/10 hover:bg-room-occupied/20",
  dirty: "border-room-dirty bg-room-dirty/10 hover:bg-room-dirty/20",
  cleaning: "border-room-cleaning bg-room-cleaning/10 hover:bg-room-cleaning/20",
  maintenance: "border-room-maintenance bg-room-maintenance/10 hover:bg-room-maintenance/20",
};

interface RoomStatusGridProps {
  rooms: Room[];
  /** Opens the room detail dialog. */
  onSelectRoom: (room: Room) => void;
  selectedRoomId?: string | null;
}

export function RoomStatusGrid({ rooms, onSelectRoom, selectedRoomId }: RoomStatusGridProps) {
  const groupedByFloor = rooms.reduce<Record<number, Room[]>>((acc, room) => {
    if (!acc[room.floor]) {
      acc[room.floor] = [];
    }
    acc[room.floor].push(room);
    return acc;
  }, {});

  return (
    <div className="glass-card overflow-hidden">
      <div className="p-4 border-b border-border">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-base font-semibold">Room Status</h3>
          <div className="flex flex-wrap gap-2">
            {ALL_STATUSES.map((status) => (
              <StatusBadge key={status} status={status} size="sm" />
            ))}
          </div>
        </div>
      </div>
      <div className="p-4 space-y-4">
        {rooms.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No rooms match the current filter.
          </p>
        ) : (
          Object.entries(groupedByFloor)
            .sort(([a], [b]) => Number(a) - Number(b))
            .map(([floor, floorRooms]) => (
              <div key={floor}>
                <p className="text-xs text-muted-foreground mb-2">
                  Floor {floor}
                </p>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                  {floorRooms.map((room) => (
                    <button
                      key={room.id}
                      type="button"
                      aria-label={`Room ${room.number}, ${room.status}`}
                      onClick={() => onSelectRoom(room)}
                      className={`p-2 sm:p-3 rounded-lg border text-center transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                        statusColors[room.status]
                      } ${
                        selectedRoomId === room.id ? "ring-2 ring-primary" : ""
                      }`}
                    >
                      <p className="text-sm font-bold">{room.number}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {room.type}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            ))
        )}
      </div>
    </div>
  );
}
