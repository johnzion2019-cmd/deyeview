import { cycleWindow } from "@/domain/billing";
import { estimateBatteryRuntime, type BatteryRuntime } from "@/domain/battery";
import { buildEarningsReport, dayEarnings, type DailyEarnings, type DayEarnings, type EarningsReport } from "@/domain/earnings";
import { formatPlantClock } from "@/domain/time";
import { plantHeroPeriod, type HeroPeriod } from "@/domain/hero";
import { buildPayback, type Payback } from "@/domain/payback";
import { buildPlantRecords, type PlantRecords } from "@/domain/records";
import { sumEnergy } from "@/domain/integrate";
import type { SolarForecast } from "@/domain/forecast";
import type { EnergyTotals, PlantProfile, Sample } from "@/domain/types";

export type EnergySnapshot = {
  sample: Sample;
  now: number;
  today: EnergyTotals;
  days: Record<string, EnergyTotals>;
  months: Record<string, EnergyTotals>;
  showcase: boolean;
};

export type ForecastBundle = {
  forecast: SolarForecast;
  source: "open-meteo" | "on-device";
  tempC: number | null;
  weatherLabel: string | null;
};

export type DashboardModel = {
  sample: Sample;
  hero: HeroPeriod;
  clockLabel: string;
  showcase: boolean;
  runtime: BatteryRuntime;
  todayEarnings: DayEarnings;
  cycleEarnings: DayEarnings;
  cycleLabel: string;
  report: EarningsReport;
  chart: DailyEarnings[];
  records: PlantRecords;
  payback: Payback;
  forecast: SolarForecast;
  forecastSource: ForecastBundle["source"];
  weatherLabel: string | null;
  tempC: number | null;
  updatedAt: number;
};

export function composeDashboard(profile: PlantProfile, snapshot: EnergySnapshot, forecast: ForecastBundle, updatedAt: number): DashboardModel {
  const report = buildEarningsReport({
    today: snapshot.today,
    tariff: profile.ratePerKwh,
    feedInRate: profile.feedInRate,
    now: snapshot.now,
    timeZone: profile.timeZone,
    liveDays: snapshot.days,
    liveMonths: snapshot.months,
  });
  const chart = report.daily.slice(-30);
  const bestSource = buildPlantRecords(report.daily, report.monthly);
  const averageSource = buildPlantRecords(chart, []);
  const records: PlantRecords = {
    bestDay: bestSource.bestDay,
    bestMonth: bestSource.bestMonth,
    average: averageSource.average,
  };
  const cycle = cycleWindow(snapshot.now, profile.timeZone, profile.billingCycleDay);
  const cycleRows = Object.entries(snapshot.days)
    .filter(([ymd]) => ymd >= cycle.startYmd && ymd <= cycle.todayYmd)
    .map(([, energy]) => energy);
  const cycleEarnings = dayEarnings(sumEnergy(cycleRows), profile.ratePerKwh, profile.feedInRate);
  const hero: HeroPeriod =
    profile.scene === "auto" ? plantHeroPeriod(snapshot.sample.ts, profile.timeZone) : profile.scene;
  return {
    sample: snapshot.sample,
    hero,
    clockLabel: formatPlantClock(snapshot.now, profile.timeZone),
    showcase: snapshot.showcase,
    runtime: estimateBatteryRuntime({
      batteryKwh: profile.batteryKwh,
      soc: snapshot.sample.batterySoc,
      batteryW: snapshot.sample.batteryW,
      reserveSoc: profile.reserveSoc,
    }),
    todayEarnings: report.today,
    cycleEarnings,
    cycleLabel: cycle.label,
    report,
    chart,
    records,
    payback: buildPayback({
      systemCost: profile.systemCost,
      lifetimeTotal: report.lifetimeTotal,
      monthly: report.monthly,
      now: snapshot.now,
      timeZone: profile.timeZone,
    }),
    forecast: forecast.forecast,
    forecastSource: forecast.source,
    weatherLabel: forecast.weatherLabel,
    tempC: forecast.tempC,
    updatedAt,
  };
}
