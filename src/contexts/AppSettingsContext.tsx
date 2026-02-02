import React, { createContext, useContext, useState, useEffect } from 'react';

type Theme = 'dark' | 'light';
type Currency = 'USD' | 'PKR' | 'EUR' | 'GBP' | 'SAR' | 'AED' | 'OMR';

interface AppSettings {
    theme: Theme;
    currency: Currency;
    setTheme: (theme: Theme) => void;
    setCurrency: (currency: Currency) => void;
}

const AppSettingsContext = createContext<AppSettings | undefined>(undefined);

export function AppSettingsProvider({ children }: { children: React.ReactNode }) {
    const [theme, setThemeState] = useState<Theme>(() => {
        const saved = localStorage.getItem('app-theme');
        return (saved as Theme) || 'dark';
    });

    const [currency, setCurrencyState] = useState<Currency>(() => {
        const saved = localStorage.getItem('app-currency');
        return (saved as Currency) || 'USD';
    });

    const setTheme = (newTheme: Theme) => {
        setThemeState(newTheme);
        localStorage.setItem('app-theme', newTheme);

        // Apply theme to document
        if (newTheme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    };

    const setCurrency = (newCurrency: Currency) => {
        setCurrencyState(newCurrency);
        localStorage.setItem('app-currency', newCurrency);
    };

    // Apply theme on mount
    useEffect(() => {
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, []);

    return (
        <AppSettingsContext.Provider value={{ theme, currency, setTheme, setCurrency }}>
            {children}
        </AppSettingsContext.Provider>
    );
}

export function useAppSettings() {
    const context = useContext(AppSettingsContext);
    if (!context) {
        throw new Error('useAppSettings must be used within AppSettingsProvider');
    }
    return context;
}

export function useTheme() {
    const { theme, setTheme } = useAppSettings();
    return { theme, setTheme };
}

export function useCurrency() {
    const { currency, setCurrency } = useAppSettings();
    return { currency, setCurrency };
}
