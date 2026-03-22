import { useState, useEffect } from "react";
import { detectUserCountry, getPricingForCountry, type PricingInfo } from "@/lib/pricing";

/**
 * Hook that detects the user's country and returns localized pricing.
 * Optionally accepts a known country code to skip detection.
 */
export function usePricing(knownCountryCode?: string | null): PricingInfo & { countryCode: string; loading: boolean } {
  const [countryCode, setCountryCode] = useState<string>(knownCountryCode || "BR");
  const [loading, setLoading] = useState(!knownCountryCode);

  useEffect(() => {
    if (knownCountryCode) {
      setCountryCode(knownCountryCode);
      setLoading(false);
      return;
    }

    let cancelled = false;
    detectUserCountry().then((code) => {
      if (!cancelled) {
        setCountryCode(code);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [knownCountryCode]);

  const pricing = getPricingForCountry(countryCode);

  return { ...pricing, countryCode, loading };
}
