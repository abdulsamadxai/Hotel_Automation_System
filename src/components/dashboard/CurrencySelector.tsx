import { DollarSign } from "lucide-react";
import { useCurrency } from "@/contexts/AppSettingsContext";
import { CURRENCIES, type Currency } from "@/utils/currency";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function CurrencySelector() {
    const { currency, setCurrency } = useCurrency();

    return (
        <div className="space-y-3">
            <Select value={currency} onValueChange={(value) => setCurrency(value as Currency)}>
                <SelectTrigger className="w-full">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    {Object.values(CURRENCIES).map((curr) => (
                        <SelectItem key={curr.code} value={curr.code}>
                            <div className="flex items-center gap-2">
                                <span className="font-mono font-bold">{curr.symbol}</span>
                                <span>{curr.name}</span>
                                <span className="text-muted-foreground">({curr.code})</span>
                            </div>
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
                <DollarSign className="h-4 w-4 inline mr-1" />
                Conversion rate: 1 USD = {CURRENCIES[currency].rate} {currency}
            </div>
        </div>
    );
}
