import { Building2, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import type { Hotel } from "@/lib/types";
import type { Currency } from "@/utils/currency";
import { formatAndConvert } from "@/utils/currency";

/** Real per-hotel counts, aggregated by the dashboard (never invented). */
export interface HotelTableStats {
    rooms: number;
    bookings: number;
    /** Sum of `total` over invoices with a paid_date. */
    revenue: number;
}

interface SuperAdminHotelTableProps {
    hotels: Hotel[];
    stats: Record<string, HotelTableStats>;
    currency: Currency;
    onSelectHotel: (id: string) => void;
}

export function SuperAdminHotelTable({ hotels, stats, currency, onSelectHotel }: SuperAdminHotelTableProps) {
    return (
        <div className="glass-card overflow-hidden animate-fade-in border border-white/5 shadow-glow">
            <div className="p-6 border-b border-white/5 flex items-center justify-between bg-primary/5">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                        <Building2 className="h-5 w-5" />
                    </div>
                    <div>
                        <h3 className="font-bold text-lg">Platform Hotel Management</h3>
                        <p className="text-sm text-muted-foreground">Global overview of all registered properties</p>
                    </div>
                </div>
            </div>
            {hotels.length === 0 ? (
                <p className="p-6 text-sm text-muted-foreground">No hotels registered yet.</p>
            ) : (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Hotel Name</TableHead>
                            <TableHead>Owner</TableHead>
                            <TableHead>Location</TableHead>
                            <TableHead className="text-right">Rooms</TableHead>
                            <TableHead className="text-right">Bookings</TableHead>
                            <TableHead className="text-right">Revenue collected</TableHead>
                            <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {hotels.map((hotel) => {
                            const hotelStats = stats[hotel.id] ?? { rooms: 0, bookings: 0, revenue: 0 };
                            return (
                                <TableRow key={hotel.id} className="hover:bg-primary/5 transition-colors">
                                    <TableCell className="font-bold">{hotel.name}</TableCell>
                                    <TableCell>{hotel.owner_name || 'N/A'}</TableCell>
                                    <TableCell className="text-muted-foreground">{hotel.location || 'Unknown'}</TableCell>
                                    <TableCell className="text-right">{hotelStats.rooms}</TableCell>
                                    <TableCell className="text-right">{hotelStats.bookings}</TableCell>
                                    <TableCell className="text-right">{formatAndConvert(hotelStats.revenue, currency)}</TableCell>
                                    <TableCell className="text-right">
                                        <Button size="sm" onClick={() => onSelectHotel(hotel.id)} className="gap-2">
                                            <LogIn className="h-3 w-3" /> Select Hotel
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            )}
        </div>
    );
}
