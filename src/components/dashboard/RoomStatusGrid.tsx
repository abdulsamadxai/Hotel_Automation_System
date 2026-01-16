import { StatusBadge } from "./StatusBadge";

interface Room {
  id: string;
  number: string;
  type: string;
  status: "available" | "occupied" | "dirty" | "cleaning" | "maintenance";
  floor: number;
}

interface RoomStatusGridProps {
  rooms: Room[];
}

export function RoomStatusGrid({ rooms }: RoomStatusGridProps) {
  const groupedByFloor = rooms.reduce((acc, room) => {
    if (!acc[room.floor]) {
      acc[room.floor] = [];
    }
    acc[room.floor].push(room);
    return acc;
  }, {} as Record<number, Room[]>);

  const statusColors: Record<Room["status"], string> = {
    available: "border-room-available bg-room-available/10 hover:bg-room-available/20",
    occupied: "border-room-occupied bg-room-occupied/10 hover:bg-room-occupied/20",
    dirty: "border-room-dirty bg-room-dirty/10 hover:bg-room-dirty/20",
    cleaning: "border-room-cleaning bg-room-cleaning/10 hover:bg-room-cleaning/20",
    maintenance: "border-room-maintenance bg-room-maintenance/10 hover:bg-room-maintenance/20",
  };

  return (
    <div className="glass-card overflow-hidden">
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Room Status</h3>
          <div className="flex gap-2">
            <StatusBadge status="available" size="sm" />
            <StatusBadge status="occupied" size="sm" />
            <StatusBadge status="dirty" size="sm" />
          </div>
        </div>
      </div>
      <div className="p-4 space-y-4">
        {Object.entries(groupedByFloor)
          .sort(([a], [b]) => Number(a) - Number(b))
          .map(([floor, floorRooms]) => (
            <div key={floor}>
              <p className="text-xs text-muted-foreground mb-2">
                Floor {floor}
              </p>
              <div className="grid grid-cols-5 gap-2">
                {floorRooms.map((room) => (
                  <button
                    key={room.id}
                    className={`p-2 rounded-lg border text-center transition-all duration-200 ${statusColors[room.status]}`}
                  >
                    <p className="text-sm font-bold">{room.number}</p>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {room.type}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
