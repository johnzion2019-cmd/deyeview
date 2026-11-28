import { currencyByCode } from "@/domain/currencies";

export function formatKw(watts: number): string {
  return `${(watts / 1000).toFixed(2)} kW`;
}

export function formatPower(watts: number): string {
  const magnitude = Math.abs(watts);
  const sign = watts < 0 ? "-" : "";
  if (magnitude >= 1000) return `${sign}${(magnitude / 1000).toFixed(2)} kW`;
  return `${sign}${Math.round(magnitude)} W`;
}

export function formatKwh(value: number, digits = 1): string {
  if (!Number.isFinite(value)) return (0).toFixed(digits);
  return value.toFixed(digits);
}

export function formatMoney(value: number, currency: string): string {
  const amount = Number.isFinite(value) ? value : 0;
  const meta = currencyByCode(currency);
  try {
    return new Intl.NumberFormat("en", {
      style: "currency",
      currency: meta.code,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${meta.code} ${amount.toFixed(2)}`;
  }
}

export function formatAgo(from: number, now: number): string {
  const seconds = Math.max(0, Math.round((now - from) / 1000));
  if (seconds < 15) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return minutes === 1 ? "1 min ago" : `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  return hours === 1 ? "1 hour ago" : `${hours} hours ago`;
}

export function formatSoc(value: number): string {
  if (!Number.isFinite(value)) return "0%";
  return `${Math.round(value)}%`;
}
