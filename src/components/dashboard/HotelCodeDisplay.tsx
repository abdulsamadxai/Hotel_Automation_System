import { useState } from "react";
import { Link } from "react-router-dom";
import { Shield, Copy, CheckCircle2, Zap, Loader2, Users } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { mockStore } from "@/lib/mockStore";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

interface HotelCodeDisplayProps {
    className?: string;
    showManageButton?: boolean;
}

export function HotelCodeDisplay({ className, showManageButton = false }: HotelCodeDisplayProps) {
    const { hotelId, role } = useAuth();
    const [copied, setCopied] = useState(false);

    // Read from the persisted store, not the static seed copy.
    const { data: hotel, isLoading } = useQuery({
        queryKey: ['hotel-details', hotelId],
        queryFn: async () => {
            if (!hotelId || hotelId === 'global') return null;
            return await mockStore.hotels.getById(hotelId) ?? null;
        },
        enabled: !!hotelId,
    });

    const copyToClipboard = () => {
        if (hotel?.access_code) {
            void navigator.clipboard.writeText(hotel.access_code);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    if (isLoading) return <div className="flex items-center gap-2 text-sm text-muted-foreground p-4"><Loader2 className="h-4 w-4 animate-spin" /> Loading access code...</div>;
    if (!hotel) return null;
    if (role !== 'owner' && role !== 'super_admin') return null;

    return (
        <div className={cn("bg-primary/5 border border-primary/20 rounded-xl p-6 space-y-4 animate-in fade-in slide-in-from-bottom-2", className)}>
            <div className="flex items-center justify-between">
                <div>
                    <h4 className="font-bold text-lg flex items-center gap-2">
                        <Shield className="h-5 w-5 text-primary" />
                        Hotel Access Code
                    </h4>
                    <p className="text-sm text-muted-foreground">Unique identifier for staff login and secure tenant isolation</p>
                </div>
                <div className="bg-background/50 border border-primary/10 px-4 py-2 rounded-lg flex items-center gap-3 shadow-sm">
                    <span className="font-mono text-2xl font-bold tracking-[0.2em] text-primary">
                        {hotel.access_code}
                    </span>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 hover:bg-primary/10 transition-colors"
                        onClick={copyToClipboard}
                        aria-label="Copy hotel access code"
                    >
                        {copied ? <CheckCircle2 className="h-4 w-4 text-status-success" /> : <Copy className="h-4 w-4" />}
                    </Button>
                </div>
            </div>
            <div className="flex items-start gap-2 text-xs text-muted-foreground bg-primary/5 p-3 rounded-lg border border-primary/5">
                <Zap className="h-3 w-3 mt-0.5 text-primary" />
                <p>Give this code to your Managers and Housekeeping staff. They will need it along with their email and password to access your hotel property specifically.</p>
            </div>
            {showManageButton && (
                <Button variant="outline" size="sm" className="w-full text-xs gap-2" asChild>
                    <Link to="/staff">
                        <Users className="h-3.5 w-3.5" />
                        Manage Accounts
                    </Link>
                </Button>
            )}
        </div>
    );
}
