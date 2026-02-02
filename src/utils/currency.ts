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
export function formatCurrency(amount: any, currency: Currency = 'USD'): string {
    try {
        const config = CURRENCIES[currency] || CURRENCIES.USD;
        const numAmount = Number(amount) || 0;
        const formatted = numAmount.toFixed(config.decimals || 2);
        return `${config.symbol || '$'}${formatted}`;
    } catch (e) {
        console.error("Currency formatting error:", e);
        return `$${amount || '0.00'}`;
    }
}

/**
 * Convert amount from USD to target currency
 */
export function convertFromUSD(amountUSD: any, toCurrency: Currency): number {
    try {
        const config = CURRENCIES[toCurrency] || CURRENCIES.USD;
        return (Number(amountUSD) || 0) * (config.rate || 1);
    } catch (e) {
        return Number(amountUSD) || 0;
    }
}

/**
 * Convert amount to USD from source currency
 */
export function convertToUSD(amount: any, fromCurrency: Currency): number {
    try {
        const config = CURRENCIES[fromCurrency] || CURRENCIES.USD;
        return (Number(amount) || 0) / (config.rate || 1);
    } catch (e) {
        return Number(amount) || 0;
    }
}

/**
 * Convert between any two currencies
 */
export function convertCurrency(
    amount: any,
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
export function formatAndConvert(amountUSD: any, currency: Currency): string {
    const converted = convertFromUSD(amountUSD, currency);
    return formatCurrency(converted, currency);
}
