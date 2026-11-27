import { DEFAULT_CYCLE_START_DAY, DEFAULT_TARIFF, clampCycleStartDay } from "@/domain/billing";
import { DEFAULT_BATTERY_RESERVE_SOC } from "@/domain/battery";
import { isKnownCurrency } from "@/domain/currencies";
import type { PlantProfile, RegionId, SceneMode } from "@/domain/types";

export const DEMO_PROFILE: PlantProfile = {
  version: 1,
  mode: "demo",
  plantName: "Demo Residence",
  region: "eu",
  appId: "",
  appSecret: "",
  email: "",
  password: "",
  companyId: "",
  deviceSn: "DEMO-8K",
  stationId: "",
  currency: "PHP",
  ratePerKwh: DEFAULT_TARIFF,
  feedInRate: 0,
  billingCycleDay: 1,
  batteryKwh: 10,
  ratedW: 8000,
  reserveSoc: DEFAULT_BATTERY_RESERVE_SOC,
  systemCost: 280_000,
  city: "Dumaguete",
  lat: 9.3068,
  lon: 123.3054,
  timeZone: "Asia/Manila",
  scene: "auto",
  housePhoto: null,
  token: null,
};

export function blankProfile(): PlantProfile {
  return {
    ...DEMO_PROFILE,
    mode: "deye",
    plantName: "",
    deviceSn: "",
    systemCost: 0,
    city: "",
    lat: 9.3068,
    lon: 123.3054,
    housePhoto: null,
    token: null,
  };
}

function num(value: unknown, fallback: number): number {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(parsed) ? parsed : fallback;
}

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export function normalizeProfile(raw: unknown): PlantProfile | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Partial<PlantProfile>;
  const region: RegionId = row.region === "us" ? "us" : "eu";
  const scene: SceneMode = row.scene === "day" || row.scene === "night" ? row.scene : "auto";
  const currency = str(row.currency).toUpperCase();
  const profile: PlantProfile = {
    version: 1,
    mode: row.mode === "deye" ? "deye" : "demo",
    plantName: str(row.plantName).trim() || (row.mode === "deye" ? "My plant" : DEMO_PROFILE.plantName),
    region,
    appId: str(row.appId).trim(),
    appSecret: str(row.appSecret).trim(),
    email: str(row.email).trim(),
    password: str(row.password),
    companyId: str(row.companyId).trim(),
    deviceSn: str(row.deviceSn).trim(),
    stationId: str(row.stationId).trim(),
    currency: isKnownCurrency(currency) ? currency : "PHP",
    ratePerKwh: Math.max(0, num(row.ratePerKwh, DEFAULT_TARIFF)),
    feedInRate: Math.max(0, num(row.feedInRate, 0)),
    billingCycleDay: clampCycleStartDay(num(row.billingCycleDay, DEFAULT_CYCLE_START_DAY)),
    batteryKwh: Math.max(0.1, num(row.batteryKwh, DEMO_PROFILE.batteryKwh)),
    ratedW: Math.max(100, num(row.ratedW, DEMO_PROFILE.ratedW)),
    reserveSoc: Math.min(90, Math.max(0, num(row.reserveSoc, DEFAULT_BATTERY_RESERVE_SOC))),
    systemCost: Math.max(0, num(row.systemCost, 0)),
    city: str(row.city).trim(),
    lat: Math.min(90, Math.max(-90, num(row.lat, DEMO_PROFILE.lat))),
    lon: Math.min(180, Math.max(-180, num(row.lon, DEMO_PROFILE.lon))),
    timeZone: str(row.timeZone).trim() || "Asia/Manila",
    scene,
    housePhoto: typeof row.housePhoto === "string" && row.housePhoto.startsWith("data:image/") ? row.housePhoto : null,
    token:
      row.token && typeof row.token === "object" && typeof row.token.token === "string"
        ? {
            token: row.token.token,
            obtainedAt: num(row.token.obtainedAt, 0),
            expiresAt: num(row.token.expiresAt, 0),
          }
        : null,
  };
  return profile;
}

export function profileHasCredentials(profile: PlantProfile): boolean {
  return Boolean(profile.appId && profile.appSecret && profile.email && profile.password && profile.deviceSn);
}

export function simConfigFromProfile(profile: PlantProfile) {
  return {
    timeZone: profile.timeZone,
    lat: profile.lat,
    lon: profile.lon,
    ratedW: profile.ratedW,
    batteryKwh: profile.batteryKwh,
    operatingMode: "Self Use",
    nominalHz: profile.timeZone.startsWith("America") ? 60 : profile.timeZone === "Asia/Manila" ? 60 : 50,
  };
}
