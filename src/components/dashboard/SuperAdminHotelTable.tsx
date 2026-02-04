import { Building2, LogIn, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { mockData } from "@/lib/mockData";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

interface SuperAdminHotelTableProps {
    onSelectHotel: (id: string) => void;
}

export function SuperAdminHotelTable({ onSelectHotel }: SuperAdminHotelTableProps) {
    const { data: hotels = [], isLoading } = useQuery({
        queryKey: ['all-hotels'],
        queryFn: async () => {
            // Return mock hotels data
            await new Promise(resolve => setTimeout(resolve, 300));
            return mockData.hotels;
        }
    });

    if (isLoading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-primary" /></div>;

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
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Hotel ID</TableHead>
                        <TableHead>Hotel Name</TableHead>
                        <TableHead>Owner</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {hotels.map((hotel: any) => (
                        <TableRow key={hotel.id} className="hover:bg-primary/5 transition-colors">
                            <TableCell className="font-mono text-xs">{hotel.id}</TableCell>
                            <TableCell className="font-bold">{hotel.name}</TableCell>
                            <TableCell>{hotel.owner_name || 'N/A'}</TableCell>
                            <TableCell className="text-muted-foreground">{hotel.location || 'Unknown'}</TableCell>
                            <TableCell className="text-right">
                                <Button size="sm" onClick={() => onSelectHotel(hotel.id)} className="gap-2">
                                    <LogIn className="h-3 w-3" /> Select Hotel
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
