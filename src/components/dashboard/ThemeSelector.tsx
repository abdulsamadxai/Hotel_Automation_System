import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/contexts/AppSettingsContext";

export function ThemeSelector() {
    const { theme, setTheme } = useTheme();

    return (
        <div className="flex gap-3">
            <button
                onClick={() => setTheme('dark')}
                className={`flex-1 flex items-center justify-center gap-2 p-4 rounded-lg border-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${theme === 'dark'
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/50'
                    }`}
            >
                <Moon className="h-5 w-5" />
                <span className="font-medium">Dark</span>
            </button>
            <button
                onClick={() => setTheme('light')}
                className={`flex-1 flex items-center justify-center gap-2 p-4 rounded-lg border-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${theme === 'light'
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/50'
                    }`}
            >
                <Sun className="h-5 w-5" />
                <span className="font-medium">Light</span>
            </button>
        </div>
    );
}
