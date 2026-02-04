import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Bed, Users, DollarSign, Loader2, Trash2, Save } from "lucide-react";
import { useRooms, useCreateRoom, useUpdateRoom, useDeleteRoom, RoomStatus, RoomType, type Room } from "@/hooks/useRooms";
import { useRealtimeRooms } from "@/hooks/useActivity";
import { useCurrency } from "@/contexts/AppSettingsContext";
import { formatAndConvert } from "@/utils/currency";

export default function Rooms() {
  useRealtimeRooms();
  const { data: rooms = [], isLoading } = useRooms();
  const { currency } = useCurrency();
  const createRoom = useCreateRoom();
  const updateRoom = useUpdateRoom();
  const deleteRoom = useDeleteRoom();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [activeFilter, setActiveFilter] = useState<RoomStatus | null>(null);
  const [formData, setFormData] = useState({
    number: "",
    type: "standard" as RoomType,
    floor: 1,
    capacity: 2,
    rate: 99,
  });

  const statusCounts = rooms.reduce((acc, room) => {
    const s = room.status as string;
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Filter rooms based on active status filter
  const filteredRooms = activeFilter
    ? rooms.filter(room => room.status === activeFilter)
    : rooms;

  const handleStatusFilter = (status: RoomStatus) => {
    setActiveFilter(activeFilter === status ? null : status);
  };

  const handleOpenDialog = (room?: Room) => {
    if (room) {
      setEditingRoom(room);
      setFormData({
        number: room.number,
        type: room.type,
        floor: room.floor,
        capacity: room.capacity,
        rate: room.rate,
      });
    } else {
      setEditingRoom(null);
      setFormData({ number: "", type: "standard", floor: 1, capacity: 2, rate: 99 });
    }
    setIsDialogOpen(true);
  };

  const handleSaveRoom = async () => {
    if (editingRoom) {
      await updateRoom.mutateAsync({
        id: editingRoom.id,
        ...formData,
      });
    } else {
      await createRoom.mutateAsync({
        number: formData.number,
        type: formData.type,
        floor: formData.floor,
        status: "available",
        capacity: formData.capacity,
        rate: formData.rate,
        amenities: [],
      });
    }
    setIsDialogOpen(false);
    setEditingRoom(null);
    setFormData({ number: "", type: "standard", floor: 1, capacity: 2, rate: 99 });
  };

  const handleStatusChange = async (roomId: string, newStatus: RoomStatus) => {
    await updateRoom.mutateAsync({ id: roomId, status: newStatus });
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
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Rooms</h1>
            <p className="text-muted-foreground">
              Manage room inventory and status
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button className="gap-2" onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4" />
              Add Room
            </Button>
          </div>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingRoom ? "Edit Room" : "Add New Room"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Room Number</Label>
                <Input
                  placeholder="e.g., 101"
                  value={formData.number}
                  onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(v) => setFormData({ ...formData, type: v as RoomType })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="standard">Standard</SelectItem>
                      <SelectItem value="deluxe">Deluxe</SelectItem>
                      <SelectItem value="suite">Suite</SelectItem>
                      <SelectItem value="penthouse">Penthouse</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Floor</Label>
                  <Input
                    type="number"
                    value={formData.floor}
                    onChange={(e) => setFormData({ ...formData, floor: parseInt(e.target.value) })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Capacity</Label>
                  <Input
                    type="number"
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Rate per night</Label>
                  <Input
                    type="number"
                    value={formData.rate}
                    onChange={(e) => setFormData({ ...formData, rate: parseFloat(e.target.value) })}
                  />
                </div>
              </div>
              <Button onClick={handleSaveRoom} disabled={createRoom.isPending || updateRoom.isPending} className="w-full">
                {createRoom.isPending || updateRoom.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : (editingRoom ? "Update Room" : "Create Room")}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Status Overview - Clickable Filters */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {(["available", "occupied", "dirty", "cleaning", "maintenance"] as const).map(
            (status) => (
              <div
                key={status}
                onClick={() => handleStatusFilter(status)}
                className={`glass-card p-4 text-center transition-all duration-200 cursor-pointer hover:scale-[1.02] active:scale-[0.98] ${activeFilter === status
                    ? "ring-2 ring-primary shadow-glow border-primary/50"
                    : "hover:border-primary/30"
                  }`}
              >
                <StatusBadge status={status} />
                <p className="text-2xl font-bold mt-2">
                  {statusCounts[status] || 0}
                </p>
              </div>
            )
          )}
        </div>

        {/* Active Filter Indicator */}
        {activeFilter && (
          <div className="flex items-center justify-between bg-primary/5 p-3 rounded-lg border border-primary/20">
            <div className="flex items-center gap-2">
              <StatusBadge status={activeFilter} size="sm" />
              <p className="text-sm font-medium">
                Showing {filteredRooms.length} {activeFilter} room{filteredRooms.length !== 1 ? 's' : ''}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setActiveFilter(null)}
              className="h-8 text-xs hover:bg-primary/10 text-primary"
            >
              Clear Filter
            </Button>
          </div>
        )}

        {/* Room Grid */}
        {filteredRooms.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
              <Bed className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">
              {activeFilter ? `No ${activeFilter} rooms found` : "No rooms configured yet"}
            </h3>
            <p className="text-muted-foreground text-sm max-w-sm mx-auto mb-4">
              {activeFilter
                ? `There are currently no rooms with status "${activeFilter}".`
                : "Add rooms to your property to start managing inventory and bookings."}
            </p>
            {!activeFilter && (
              <Button className="gap-2" onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4" />
                Add Room
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredRooms.map((room) => (
              <div
                key={room.id}
                className="glass-card p-4 hover:border-primary/30 transition-all duration-300 cursor-pointer group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-lg font-bold">Room {room.number}</h3>
                    <p className="text-sm text-muted-foreground capitalize">{room.type}</p>
                  </div>
                  <StatusBadge status={room.status} size="sm" />
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Bed className="h-4 w-4" />
                    <span>Floor {room.floor}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>{room.capacity} guests max</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <DollarSign className="h-4 w-4" />
                    <span>{formatAndConvert(room.rate, currency)}/night</span>
                  </div>
                </div>

                <div className="mt-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Select
                    value={room.status}
                    onValueChange={(v) => handleStatusChange(room.id, v as RoomStatus)}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Change status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="available">Available</SelectItem>
                      <SelectItem value="occupied">Occupied</SelectItem>
                      <SelectItem value="dirty">Dirty</SelectItem>
                      <SelectItem value="cleaning">Cleaning</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleOpenDialog(room)}
                  >
                    <Save className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={() => {
                      if (confirm("Are you sure you want to delete this room? This cannot be undone.")) {
                        deleteRoom.mutate(room.id);
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout >
  );
}
