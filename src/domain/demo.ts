import type { Sample } from "@/domain/types";
import { dayOfYear, localHour, timezoneOffsetHours, zonedParts, zonedTimeToUtc } from "@/domain/time";

export const SHOWCASE_HOUR = 11;
export const SHOWCASE_MINUTE = 15;
const SIM_RESERVE_SOC = 12;

export type SimConfig = {
  timeZone: string;
  lat: number;
  lon: number;
  ratedW: number;
  batteryKwh: number;
  operatingMode: string;
  nominalHz: number;
};

export function batteryPowerLimits(batteryKwh: number): { maxChargeW: number; maxDischargeW: number } {
  const kwh = Math.max(1, Number.isFinite(batteryKwh) ? batteryKwh : 1);
  return {
    maxChargeW: Math.min(6000, Math.max(800, kwh * 140)),
    maxDischargeW: Math.min(10_000, Math.max(1500, kwh * 350)),
  };
}

export function hashString(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function hash01(n: number): number {
  let x = n >>> 0;
  x = Math.imul(x ^ (x >>> 16), 0x7feb352d);
  x = Math.imul(x ^ (x >>> 15), 0x846ca68b);
  x = (x ^ (x >>> 16)) >>> 0;
  return x / 4294967296;
}

function gauss(x: number, center: number, width: number): number {
  const d = (x - center) / width;
  return Math.exp(-d * d);
}

export function cloudFactor(ymd: string, hour: number): number {
  const dayHash = hashString(ymd);
  const rainy = dayHash % 7 === 3;
  const at = (h: number) => {
    const hh = ((Math.floor(h) % 24) + 24) % 24;
    const n = hash01(dayHash ^ Math.imul(hh + 1, 997));
    return rainy ? 0.18 + n * 0.32 : 0.62 + n * 0.38;
  };
  const h0 = Math.floor(hour);
  const frac = hour - h0;
  const smooth = frac * frac * (3 - 2 * frac);
  return at(h0) * (1 - smooth) + at(h0 + 1) * smooth;
}

export function pvPowerW(ts: number, cfg: SimConfig): number {
  if (cfg.ratedW <= 0) return 0;
  const parts = zonedParts(ts, cfg.timeZone);
  const hour = localHour(ts, cfg.timeZone);
  const declDeg = 23.44 * Math.sin((2 * Math.PI * (dayOfYear(parts) - 81)) / 365);
  const lat = (cfg.lat * Math.PI) / 180;
  const dec = (declDeg * Math.PI) / 180;
  const offset = timezoneOffsetHours(ts, cfg.timeZone);
  const solarNoon = 12 - cfg.lon / 15 + offset;
  const hourAngle = ((hour - solarNoon) * 15 * Math.PI) / 180;
  const sinElev = Math.sin(lat) * Math.sin(dec) + Math.cos(lat) * Math.cos(dec) * Math.cos(hourAngle);
  if (sinElev <= 0.02) return 0;
  const sinNoon = Math.sin(lat) * Math.sin(dec) + Math.cos(lat) * Math.cos(dec);
  if (sinNoon <= 0.05) return 0;
  const clear = cloudFactor(parts.ymd, hour);
  const wobble = 0.97 + hash01(Math.floor(ts / 60_000)) * 0.06;
  const flutter = 0.985 + hash01(Math.floor(ts / 1000) ^ 0x51ed) * 0.03;
  return Math.max(0, Math.min(cfg.ratedW, cfg.ratedW * (sinElev / sinNoon) * clear * wobble * flutter * 0.97));
}

export function loadPowerW(ts: number, cfg: SimConfig): number {
  const parts = zonedParts(ts, cfg.timeZone);
  const hour = localHour(ts, cfg.timeZone);
  const dayScale = 0.92 + hash01(hashString(parts.ymd)) * 0.16;
  const wobble = 0.94 + hash01((Math.floor(ts / 1000) ^ 0x9e3779b9) >>> 0) * 0.1;
  const base = 280 + 420 * gauss(hour, 7.1, 1.15) + 180 * gauss(hour, 12.4, 2.3) + 760 * gauss(hour, 19.25, 1.65);
  const scaled = cfg.ratedW > 0 ? Math.min(1.4, Math.max(0.55, cfg.ratedW / 8000)) : 1;
  return Math.max(140, base * dayScale * wobble * scaled);
}

export type StepResult = {
  sample: Sample;
  soc: number;
};

export function simulateStep(ts: number, socIn: number, dtHours: number, cfg: SimConfig): StepResult {
  const dt = dtHours > 0 ? dtHours : 1 / 3600;
  const pvW = pvPowerW(ts, cfg);
  const demandW = loadPowerW(ts, cfg);
  const capacityWh = Math.max(0.1, cfg.batteryKwh * 1000);
  const soc = Math.min(100, Math.max(0, socIn));
  const { maxChargeW, maxDischargeW } = batteryPowerLimits(cfg.batteryKwh);
  const net = pvW - demandW;
  const roomWh = Math.max(0, ((100 - soc) / 100) * capacityWh);
  const availWh = Math.max(0, ((soc - SIM_RESERVE_SOC) / 100) * capacityWh);
  const roomW = roomWh / dt;
  const availW = availWh / dt;

  let batteryW = 0;
  let gridW = 0;
  const loadW = demandW;

  if (net >= 0) {
    const charge = Math.min(net, maxChargeW, roomW);
    batteryW = -charge;
    gridW = -(net - charge);
  } else {
    const need = -net;
    const discharge = Math.min(need, maxDischargeW, availW);
    batteryW = discharge;
    gridW = need - discharge;
  }

  const nextSoc = Math.min(100, Math.max(0, soc + (-batteryW * dt * 100) / capacityWh));
  const batteryV = 49.2 + (nextSoc / 100) * 5.4;
  const acV = 229.4 + hash01(Math.floor(ts / 60_000)) * 1.6;
  const acHz = cfg.nominalHz + (hash01(Math.floor(ts / 30_000)) - 0.5) * 0.04;
  const irr = cfg.ratedW > 0 ? Math.min(1, pvW / cfg.ratedW) : 0;
  const pv1W = pvW * 0.40;
  const pv2W = pvW * 0.32;
  const pv3W = pvW * 0.28;
  const pv1V = pvW < 8 ? 0 : 286 + irr * 92;
  const pv2V = pvW < 8 ? 0 : 280 + irr * 90;
  const pv3V = pvW < 8 ? 0 : 275 + irr * 88;

  const sample: Sample = {
    ts,
    source: "demo",
    pvW,
    pv1V,
    pv1A: pv1V > 0 ? pv1W / pv1V : 0,
    pv1W,
    pv2V,
    pv2A: pv2V > 0 ? pv2W / pv2V : 0,
    pv2W,
    pv3V,
    pv3A: pv3V > 0 ? pv3W / pv3V : 0,
    pv3W,
    loadW,
    gridW,
    gridStatus: "on-grid",
    batteryW,
    batterySoc: nextSoc,
    batteryV,
    acV,
    acHz,
    operatingMode: cfg.operatingMode,
    online: true,
  };
  return { sample, soc: nextSoc };
}

/** Daytime uses the real clock. At night, park the demo on a sunny late morning so the flow is visible. */
export function chooseDemoClock(realNow: number, timeZone: string): { virtualNow: number; showcase: boolean } {
  const parts = zonedParts(realNow, timeZone);
  const hour = localHour(realNow, timeZone);
  if (hour >= 7 && hour <= 17) return { virtualNow: realNow, showcase: false };
  return {
    virtualNow: zonedTimeToUtc(
      { year: parts.year, month: parts.month, day: parts.day, hour: SHOWCASE_HOUR, minute: SHOWCASE_MINUTE },
      timeZone,
    ),
    showcase: true,
  };
}
