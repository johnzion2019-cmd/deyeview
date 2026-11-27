import { addEnergyTotals, emptyEnergy, integrateSamples } from "@/domain/integrate";
import { simulateStep, type SimConfig } from "@/domain/demo";
import { addZonedDays, startOfZonedDay, zonedParts } from "@/domain/time";
import type { EnergyTotals, Sample } from "@/domain/types";

export type EnergyArchive = {
  days: Record<string, EnergyTotals>;
  months: Record<string, EnergyTotals>;
  soc: number;
};

function simulateSpan(start: number, end: number, socIn: number, cfg: SimConfig, stepMs: number): { energy: EnergyTotals; soc: number } {
  if (end <= start) return { energy: emptyEnergy(), soc: socIn };
  const samples: Sample[] = [];
  let soc = socIn;
  const stepHours = stepMs / 3_600_000;
  for (let ts = start; ts < end; ts += stepMs) {
    const at = Math.min(end, ts + stepMs / 2);
    const step = simulateStep(at, soc, stepHours, cfg);
    soc = step.soc;
    samples.push({ ...step.sample, ts });
  }
  if (samples.length === 0) return { energy: emptyEnergy(), soc };
  return { energy: integrateSamples(samples, end), soc };
}

export function rollupMonths(days: Record<string, EnergyTotals>): Record<string, EnergyTotals> {
  const months: Record<string, EnergyTotals> = {};
  for (const [ymd, energy] of Object.entries(days)) {
    const key = ymd.slice(0, 7);
    months[key] = addEnergyTotals(months[key] ?? emptyEnergy(), energy);
  }
  return months;
}

/** Past days plus a partial current day, walking state of charge forward. */
export function buildDemoArchive(virtualNow: number, cfg: SimConfig, daysBack = 90): EnergyArchive & { today: EnergyTotals } {
  const zone = cfg.timeZone;
  const todayStart = startOfZonedDay(virtualNow, zone);
  let cursor = addZonedDays(todayStart, zone, -daysBack);
  let soc = 48;
  const days: Record<string, EnergyTotals> = {};
  for (let i = 0; i < daysBack; i += 1) {
    const ymd = zonedParts(cursor, zone).ymd;
    const next = addZonedDays(cursor, zone, 1);
    const span = simulateSpan(cursor, next, soc, cfg, 30 * 60 * 1000);
    days[ymd] = span.energy;
    soc = span.soc;
    cursor = next;
  }
  const today = simulateSpan(todayStart, virtualNow, soc, cfg, 15 * 60 * 1000);
  const todayYmd = zonedParts(virtualNow, zone).ymd;
  days[todayYmd] = today.energy;
  return { days, months: rollupMonths(days), soc: today.soc, today: today.energy };
}

export function addIntervalEnergy(energy: EnergyTotals, sample: Sample, dtHours: number): EnergyTotals {
  if (dtHours <= 0 || dtHours > 2) return { ...energy, socClose: sample.batterySoc };
  return {
    productionKwh: energy.productionKwh + (sample.pvW * dtHours) / 1000,
    loadKwh: energy.loadKwh + (sample.loadW * dtHours) / 1000,
    chargeKwh: energy.chargeKwh + (sample.batteryW < 0 ? (-sample.batteryW * dtHours) / 1000 : 0),
    dischargeKwh: energy.dischargeKwh + (sample.batteryW > 0 ? (sample.batteryW * dtHours) / 1000 : 0),
    importKwh: energy.importKwh + (sample.gridW > 0 ? (sample.gridW * dtHours) / 1000 : 0),
    exportKwh: energy.exportKwh + (sample.gridW < 0 ? (-sample.gridW * dtHours) / 1000 : 0),
    socClose: sample.batterySoc,
  };
}
