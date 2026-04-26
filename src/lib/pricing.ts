// Global pricing configuration
// Base price in USD for international customers
const BASE_PRICE_USD = 19.90;
const BRAZIL_PRICE_BRL = 119.90;
export const BRAZIL_PROMO_PRICE_BRL = 69.90;
export const PROMO_COUPON_CODE = "Primeiros100";
export const PROMO_DURATION_MONTHS = 12;

// Fixed exchange rates (mock — ready for future API integration)
const exchangeRates: Record<string, Record<string, number>> = {
  USD: { EUR: 0.92, GBP: 0.79, BRL: 5.50 },
  BRL: { USD: 0.18, EUR: 0.17, GBP: 0.14 },
  EUR: { USD: 1.09, BRL: 5.98, GBP: 0.86 },
};

// European country codes (ISO 3166-1 alpha-2)
const europeanCountries = new Set([
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR",
  "DE", "GR", "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL",
  "PL", "PT", "RO", "SK", "SI", "ES", "SE",
]);

export type PricingInfo = {
  price: number;
  currency: string;
  label: string;
  periodLabel: string;
};

/**
 * Convert currency using fixed mock rates.
 * Ready for future integration with a live exchange rate API.
 */
export function convertCurrency(value: number, from: string, to: string): number {
  if (from === to) return value;
  const rate = exchangeRates[from]?.[to];
  if (!rate) return value; // fallback: no conversion
  return Math.round(value * rate * 100) / 100;
}

/**
 * Determine pricing based on country code.
 */
export function getPricingForCountry(countryCode: string | null | undefined): PricingInfo {
  const code = (countryCode || "").toUpperCase();

  if (code === "BR") {
    return {
      price: BRAZIL_PRICE_BRL,
      currency: "BRL",
      label: formatPrice(BRAZIL_PRICE_BRL, "BRL"),
      periodLabel: "/mês",
    };
  }

  if (europeanCountries.has(code)) {
    const eurPrice = convertCurrency(BASE_PRICE_USD, "USD", "EUR");
    return {
      price: eurPrice,
      currency: "EUR",
      label: formatPrice(eurPrice, "EUR"),
      periodLabel: "/month",
    };
  }

  // Default: USD
  return {
    price: BASE_PRICE_USD,
    currency: "USD",
    label: formatPrice(BASE_PRICE_USD, "USD"),
    periodLabel: "/month",
  };
}

/**
 * Format price using Intl.NumberFormat
 */
export function formatPrice(value: number, currency: string): string {
  const localeMap: Record<string, string> = {
    BRL: "pt-BR",
    USD: "en-US",
    EUR: "de-DE",
    GBP: "en-GB",
  };
  const locale = localeMap[currency] || "en-US";

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Detect user country. Uses tenant billing info first, then IP fallback.
 */
export async function detectUserCountry(): Promise<string> {
  try {
    const res = await fetch("https://ipapi.co/json/", { signal: AbortSignal.timeout(3000) });
    if (res.ok) {
      const data = await res.json();
      return (data.country_code || "BR").toUpperCase();
    }
  } catch {
    // fallback silently
  }
  return "BR"; // default fallback
}
