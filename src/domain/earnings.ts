import { addEnergyTotals, emptyEnergy, mergeEnergyTotals } from "@/domain/integrate";
import { zonedParts } from "@/domain/time";
import type { EnergyTotals } from "@/domain/types";

export function roundMoney(value: number): number {
  return Math.round((Number.isFinite(value) ? value : 0) * 100) / 100;
}

/**
 * Energy the home used that did not come from the grid.
 * Load minus import stays meaningful after sunset, when production is 0.
 * If load is missing, fall back to production minus export, then discharge.
 */
export function selfSuppliedKwh(
  energy: Pick<EnergyTotals, "productionKwh" | "exportKwh" | "dischargeKwh" | "loadKwh" | "importKwh">,
): number {
  const load = Math.max(0, energy.loadKwh);
  const imported = Math.max(0, energy.importKwh);
  if (load > 0) return Math.max(0, load - imported);
  const production = Math.max(0, energy.productionKwh);
  const exported = Math.max(0, energy.exportKwh);
  if (production > 0) return Math.max(0, production - exported);
  return Math.max(0, energy.dischargeKwh);
}

export type DayEarnings = {
  total: number;
  consumptionSavings: number;
  feedInEarnings: number;
  selfSuppliedKwh: number;
  loadKwh: number;
  importKwh: number;
  exportKwh: number;
  productionKwh: number;
  tariff: number;
  feedInRate: number;
};

export type DailyEarnings = DayEarnings & {
  period: string;
  label: string;
};

export type MonthlyEarnings = DayEarnings & {
  period: string;
  label: string;
};

export function dayEarnings(energy: EnergyTotals, tariff: number, feedInRate = 0): DayEarnings {
  const supplied = selfSuppliedKwh(energy);
  const exported = Math.max(0, energy.exportKwh);
  const rate = Math.max(0, tariff);
  const feedIn = Math.max(0, feedInRate);
  const consumptionSavings = roundMoney(supplied * rate);
  const feedInEarnings = roundMoney(exported * feedIn);
  return {
    total: roundMoney(consumptionSavings + feedInEarnings),
    consumptionSavings,
    feedInEarnings,
    selfSuppliedKwh: supplied,
    loadKwh: Math.max(0, energy.loadKwh),
    importKwh: Math.max(0, energy.importKwh),
    exportKwh: exported,
    productionKwh: Math.max(0, energy.productionKwh),
    tariff: rate,
    feedInRate: feedIn,
  };
}

function dayLabel(period: string): string {
  const [year, month, day] = period.split("-").map(Number);
  if (!year || !month || !day) return period;
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(year, month - 1, day)),
  );
}

function monthLabel(period: string): string {
  const [year, month] = period.split("-").map(Number);
  if (!year || !month) return period;
  return new Intl.DateTimeFormat("en", { month: "short", year: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(year, month - 1, 1)),
  );
}

export function toDailyEarnings(period: string, energy: EnergyTotals, tariff: number, feedInRate: number): DailyEarnings {
  return { period, label: dayLabel(period), ...dayEarnings(energy, tariff, feedInRate) };
}

function monthFromDays(period: string, days: Record<string, EnergyTotals>): EnergyTotals {
  const rows = Object.entries(days)
    .filter(([ymd]) => ymd.startsWith(`${period}-`))
    .map(([, energy]) => energy);
  return rows.reduce((sum, energy) => addEnergyTotals(sum, energy), emptyEnergy());
}

export type EarningsReport = {
  today: DayEarnings;
  daily: DailyEarnings[];
  monthly: MonthlyEarnings[];
  lifetimeTotal: number;
};

export function buildEarningsReport(input: {
  today: EnergyTotals;
  tariff: number;
  feedInRate?: number;
  now: number;
  timeZone: string;
  liveDays?: Record<string, EnergyTotals>;
  liveMonths?: Record<string, EnergyTotals>;
}): EarningsReport {
  const tariff = input.tariff;
  const feedInRate = input.feedInRate ?? 0;
  const todayYmd = zonedParts(input.now, input.timeZone).ymd;
  const currentPeriod = todayYmd.slice(0, 7);
  const liveDays = { ...(input.liveDays ?? {}) };
  liveDays[todayYmd] = input.today;
  const today = dayEarnings(input.today, tariff, feedInRate);

  const daily = Object.keys(liveDays)
    .filter((period) => /^\d{4}-\d{2}-\d{2}$/.test(period) && period <= todayYmd)
    .sort()
    .map((period) => toDailyEarnings(period, liveDays[period] ?? emptyEnergy(), tariff, feedInRate));

  const periods = new Set<string>([currentPeriod, ...Object.keys(input.liveMonths ?? {})]);
  for (const ymd of Object.keys(liveDays)) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(ymd)) periods.add(ymd.slice(0, 7));
  }

  const monthly = [...periods]
    .filter((period) => /^\d{4}-\d{2}$/.test(period) && period <= currentPeriod)
    .sort()
    .map((period) => {
      const fromDays = monthFromDays(period, liveDays);
      const fromApi = input.liveMonths?.[period];
      const energy = fromApi ? mergeEnergyTotals(fromApi, fromDays) : fromDays;
      const earned = dayEarnings(energy, tariff, feedInRate);
      return { period, label: monthLabel(period), ...earned };
    });

  const lifetimeTotal = roundMoney(monthly.reduce((sum, month) => sum + month.total, 0));
  return { today, daily, monthly, lifetimeTotal };
}
