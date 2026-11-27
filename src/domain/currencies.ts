export type Currency = {
  code: string;
  label: string;
};

export const CURRENCIES: readonly Currency[] = [
  { code: "PHP", label: "Philippine peso" },
  { code: "USD", label: "US dollar" },
  { code: "EUR", label: "Euro" },
  { code: "GBP", label: "British pound" },
  { code: "AUD", label: "Australian dollar" },
  { code: "ZAR", label: "South African rand" },
  { code: "INR", label: "Indian rupee" },
  { code: "CAD", label: "Canadian dollar" },
  { code: "NZD", label: "New Zealand dollar" },
  { code: "SGD", label: "Singapore dollar" },
  { code: "MYR", label: "Malaysian ringgit" },
  { code: "THB", label: "Thai baht" },
  { code: "AED", label: "UAE dirham" },
  { code: "BRL", label: "Brazilian real" },
] as const;

const KNOWN = new Set(CURRENCIES.map((currency) => currency.code));

export function currencyByCode(code: string): Currency {
  const upper = code.trim().toUpperCase();
  return CURRENCIES.find((currency) => currency.code === upper) ?? { code: KNOWN.has(upper) ? upper : "USD", label: upper };
}

export function isKnownCurrency(code: string): boolean {
  return KNOWN.has(code.trim().toUpperCase());
}
