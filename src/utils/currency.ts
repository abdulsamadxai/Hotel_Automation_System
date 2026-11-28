export type Currency = 'USD' | 'PKR' | 'EUR' | 'GBP' | 'SAR' | 'AED' | 'OMR';

export interface CurrencyConfig {
    code: Currency;
    symbol: string;
    name: string;
    rate: number; // Conversion rate from USD
    decimals: number;
}

export const CURRENCIES: Record<Currency, CurrencyConfig> = {
    USD: {
        code: 'USD',
        symbol: '$',
        name: 'US Dollar',
        rate: 1,
        decimals: 2,
    },
    PKR: {
        code: 'PKR',
        symbol: 'Rs',
        name: 'Pakistani Rupee',
        rate: 278,
        decimals: 0,
    },
    EUR: {
        code: 'EUR',
        symbol: '€',
        name: 'Euro',
        rate: 0.92,
        decimals: 2,
    },
    GBP: {
        code: 'GBP',
        symbol: '£',
        name: 'British Pound',
        rate: 0.79,
        decimals: 2,
    },
    SAR: {
        code: 'SAR',
        symbol: 'SR',
        name: 'Saudi Riyal',
        rate: 3.75,
        decimals: 2,
    },
    AED: {
        code: 'AED',
        symbol: 'DH',
        name: 'UAE Dirham',
        rate: 3.67,
        decimals: 2,
    },
    OMR: {
        code: 'OMR',
        symbol: 'RO',
        name: 'Omani Riyal',
        rate: 0.380,
        decimals: 3,
    },
};


/**
 * Format a number as currency with proper symbol and decimals
 */
export function formatCurrency(amount: unknown, currency: Currency = 'USD'): string {
    try {
        const config = CURRENCIES[currency] || CURRENCIES.USD;
        const numAmount = Number(amount) || 0;
        const formatted = numAmount.toFixed(config.decimals || 2);
        return `${config.symbol || '$'}${formatted}`;
    } catch (e: unknown) {
        console.error("Currency formatting error:", e);
        return `$${amount || '0.00'}`;
    }
}

/**
 * Convert amount from USD to target currency
 */
export function convertFromUSD(amountUSD: unknown, toCurrency: Currency): number {
    try {
        return (Number(amountUSD) || 0) * getRate(toCurrency);
    } catch (_e: unknown) {
        return Number(amountUSD) || 0;
    }
}

/**
 * Convert amount to USD from source currency
 */
export function convertToUSD(amount: unknown, fromCurrency: Currency): number {
    try {
        return (Number(amount) || 0) / getRate(fromCurrency);
    } catch (_e: unknown) {
        return Number(amount) || 0;
    }
}

/**
 * Convert between any two currencies
 */
export function convertCurrency(
    amount: unknown,
    from: Currency,
    to: Currency
): number {
    if (from === to) return Number(amount) || 0;
    const usdAmount = convertToUSD(amount, from);
    return convertFromUSD(usdAmount, to);
}

/**
 * Format and convert currency in one step
 * Assumes input amount is in USD
 */
export function formatAndConvert(amountUSD: unknown, currency: Currency): string {
    const converted = convertFromUSD(amountUSD, currency);
    return formatCurrency(converted, currency);
}

// ------------------------------------------------------------------
// Live exchange rates
// ------------------------------------------------------------------
// The CURRENCIES table above is the fallback. On app start the provider
// fetches real rates (free endpoint, no key) and overrides them here, so
// every amount in the app converts at the day's rate. When the fetch
// fails or the user is offline, the fallback rates above are used and
// nothing breaks.

/** Live rate per currency, USD-based. Empty until fetchLiveRates() runs. */
let liveRates: Partial<Record<Currency, number>> = {};

const LIVE_RATES_CACHE_KEY = 'app-live-rates';
/** Cached rates stay fresh for 12 hours. */
const LIVE_RATES_TTL_MS = 12 * 60 * 60 * 1000;

/** Rate to use right now: live when available, otherwise the fallback. */
export function getRate(currency: Currency): number {
    return liveRates[currency] ?? CURRENCIES[currency]?.rate ?? 1;
}

/** True once live rates have been loaded (for the Settings page note). */
export function hasLiveRates(): boolean {
    return Object.keys(liveRates).length > 0;
}

function applyRates(rates: Partial<Record<Currency, number>>) {
    liveRates = { ...liveRates, ...rates };
}

/** Load cached rates (if fresh) without a network call. */
export function loadCachedRates(): boolean {
    try {
        const raw = localStorage.getItem(LIVE_RATES_CACHE_KEY);
        if (!raw) return false;
        const parsed = JSON.parse(raw) as { at: number; rates: Partial<Record<Currency, number>> };
        if (Date.now() - parsed.at > LIVE_RATES_TTL_MS) return false;
        applyRates(parsed.rates);
        return true;
    } catch {
        return false;
    }
}

/**
 * Fetch live USD-based rates from the free exchangerate-api endpoint
 * (no key needed). Returns true when live rates are now in use.
 * Any failure is silent — the fallback rates keep working.
 */
export async function fetchLiveRates(): Promise<boolean> {
    try {
        const res = await fetch('https://open.er-api.com/v6/latest/USD');
        if (!res.ok) return false;
        const data = (await res.json()) as { rates?: Record<string, number> };
        if (!data.rates) return false;
        const rates: Partial<Record<Currency, number>> = {};
        (Object.keys(CURRENCIES) as Currency[]).forEach((code) => {
            const rate = data.rates?.[code];
            if (typeof rate === 'number' && rate > 0) rates[code] = rate;
        });
        if (Object.keys(rates).length === 0) return false;
        applyRates(rates);
        try {
            localStorage.setItem(
                LIVE_RATES_CACHE_KEY,
                JSON.stringify({ at: Date.now(), rates }),
            );
        } catch {
            // Storage full or unavailable — live rates still work in memory.
        }
        return true;
    } catch {
        return false;
    }
}
