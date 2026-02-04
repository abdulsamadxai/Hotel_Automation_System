import { Loader2 } from "lucide-react";

export function GlobalLoader() {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-md animate-fade-in">
            <div className="flex flex-col items-center gap-4">
                <div className="relative h-16 w-16">
                    <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
                    <Loader2 className="h-16 w-16 text-primary animate-spin" />
                </div>
                <div className="space-y-1 text-center">
                    <h2 className="text-lg font-bold tracking-tight">Hotel Autopilot</h2>
                    <p className="text-sm text-muted-foreground animate-pulse">Initializing property management...</p>
                </div>
            </div>
        </div>
    );
}
