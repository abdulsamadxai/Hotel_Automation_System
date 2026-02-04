import { TrendingUp, DollarSign } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useInvoices } from "@/hooks/useInvoices";

interface SaaSRevenueCardProps {
    hotelId: string | null;
}

export function SaaSRevenueCard({ hotelId }: SaaSRevenueCardProps) {
    const { data: invoices = [] } = useInvoices();

    // Logic: Platform charges 10% of revenue + $50 maintenance fee per paid invoice (simplified)
    const totalSaaSRevenue = invoices
        .filter(i => i.status === 'paid')
        .reduce((acc, inv) => acc + (Number(inv.amount) * 0.1) + 50, 0);

    return (
        <div className="glass-card p-6 border-status-success/20 bg-status-success/5 animate-pulse-slow">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-status-success" />
                    <h3 className="font-bold text-lg">SaaS Platform Revenue</h3>
                </div>
                <Badge variant="outline" className="bg-status-success/10 text-status-success border-status-success/20">
                    Owner Only
                </Badge>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <p className="text-sm text-muted-foreground italic">Platform Earnings</p>
                    <p className="text-2xl font-bold text-status-success">
                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(totalSaaSRevenue)}
                    </p>
                </div>
                <div className="text-right">
                    <p className="text-sm text-muted-foreground italic">Hotel Assignment</p>
                    <p className="text-xs font-mono">{hotelId || 'Global Network'}</p>
                </div>
            </div>
            <p className="mt-4 text-[10px] text-muted-foreground uppercase tracking-widest text-center opacity-60">
                Charges: 10% Platform + $50/Invoice Maintenance
            </p>
        </div>
    );
}
