import { deyePasswordField } from "@/domain/password";
import { zonedParts } from "@/domain/time";
import type { EnergyTotals, GridStatus, Sample, StoredToken } from "@/domain/types";

/**
 * Deye Cloud Open API v1.0 client.
 * Hosts: https://eu1-developer.deyecloud.com and https://us1-developer.deyecloud.com
 * Password is SHA-256 hex before POST /v1.0/account/token.
 * Tokens last about 60 days and are refreshed two days early, and again after an auth error.
 */

export const DEYE_ORIGINS = {
  eu: "https://eu1-developer.deyecloud.com",
  us: "https://us1-developer.deyecloud.com",
} as const;

export class DeyeError extends Error {
  code?: string;
  auth: boolean;

  constructor(message: string, code?: string, auth = false) {
    super(message);
    this.name = "DeyeError";
    this.code = code;
    this.auth = auth;
  }
}

export type DeyeRegion = keyof typeof DEYE_ORIGINS | "custom";

export type DeyeCredentials = {
  region: DeyeRegion;
  baseUrl?: string;
  appId: string;
  appSecret: string;
  email: string;
  password: string;
  companyId?: string;
  stationId?: string;
  deviceSn?: string;
};

export type DeyeStation = {
  id: number;
  name: string;
  lat: number | null;
  lon: number | null;
  timezone: string | null;
};

export type DeyeDevice = {
  sn: string;
  stationId: number | null;
  model: string | null;
};

export type HistoryEnergyPoint = {
  period: string;
  grain: "day" | "month";
  productionKwh?: number;
  loadKwh?: number;
  chargeKwh?: number;
  dischargeKwh?: number;
  importKwh?: number;
  exportKwh?: number;
  soc?: number;
};

export type DeyeResponse = {
  status: number;
  body: Record<string, unknown>;
};

export type DeyePoster = (url: string, token: string | null, payload: unknown) => Promise<DeyeResponse>;

const KEY_MAP: Record<string, string> = {
  soc: "soc",
  batterysoc: "soc",
  batterypower: "batteryW",
  totalsolarpower: "pvW",
  pvpower: "pvW",
  totalconsumptionpower: "loadW",
  loadpower: "loadW",
  consumptionpower: "loadW",
  totalgridpower: "gridW",
  gridpower: "gridW",
  batteryvoltage: "batteryV",
  gridvoltage: "acV",
  acvoltage: "acV",
  gridfrequency: "acHz",
  acfrequency: "acHz",
  dailyactiveproduction: "dailyKwh",
  dailypvproduction: "dailyKwh",
  dailypvenergy: "dailyKwh",
  pvdailyenergy: "dailyKwh",
  dailygeneration: "dailyKwh",
  dailyenergy: "dailyKwh",
  dailyproduction: "dailyKwh",
  todayenergy: "dailyKwh",
  etoday: "dailyKwh",
  dailyconsumption: "dailyLoadKwh",
  dailyloadconsumption: "dailyLoadKwh",
  dailyload: "dailyLoadKwh",
  todayconsumption: "dailyLoadKwh",
  dailydischargingenergy: "dailyDischargeKwh",
  dailydischargeenergy: "dailyDischargeKwh",
  dailychargingenergy: "dailyChargeKwh",
  dailychargeenergy: "dailyChargeKwh",
  dailyimport: "dailyImportKwh",
  dailyenergypurchased: "dailyImportKwh",
  dailypurchasingenergy: "dailyImportKwh",
  dailyexport: "dailyExportKwh",
  dailysell: "dailyExportKwh",
  dailygridfeedin: "dailyExportKwh",
  workmode: "mode",
  energypattern: "mode",
  runningstatus: "mode",
  gridstatus: "gridStatus",
  offgrid: "offGrid",
};

const MODE_LABELS: Record<string, string> = {
  manual: "Manual Mode",
  sellingfirst: "Selling First",
  zeroexport: "Zero Export",
  selfuse: "Self Use",
  batteryfirst: "Battery First",
  "0": "Standby",
  "1": "Self Use",
  "2": "Selling First",
  "3": "Manual Mode",
};

export function deyeOrigin(region: keyof typeof DEYE_ORIGINS): string {
  return DEYE_ORIGINS[region];
}

export function resolveDeyeBaseUrl(region: string, custom?: string): string {
  if (region === "eu" || region === "us") return `${DEYE_ORIGINS[region]}/v1.0`;
  if (region !== "custom") throw new DeyeError("Unknown Deye region");
  const raw = (custom || "").trim().replace(/\/+$/, "");
  if (!raw) throw new DeyeError("Custom Deye base URL is required");
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new DeyeError("Deye base URL is not a valid URL");
  }
  if (url.protocol !== "https:") throw new DeyeError("Deye base URL must start with https://");
  const host = url.hostname.toLowerCase();
  if (
    host === "localhost" ||
    host.endsWith(".local") ||
    host === "0.0.0.0" ||
    host === "::1" ||
    /^(127\.|10\.|192\.168\.|169\.254\.|0\.|172\.(1[6-9]|2\d|3[0-1])\.)/.test(host)
  ) {
    throw new DeyeError("Deye base URL must be a public https host");
  }
  const path = url.pathname.replace(/\/+$/, "");
  const base = `${url.origin}${path === "" || path === "/" ? "" : path}`;
  return base.endsWith("/v1.0") ? base : `${base}/v1.0`;
}

function normKey(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function num(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function epochMs(value: number | null, fallback: number): number {
  if (value == null) return fallback;
  if (value > 1e12) return value;
  if (value > 1e9) return value * 1000;
  return fallback;
}

function labelMode(raw: string | null): string {
  if (!raw) return "Self Use";
  const compact = normKey(raw);
  return MODE_LABELS[compact] ?? MODE_LABELS[raw] ?? raw;
}

function asArray(body: unknown, keys: string[]): Record<string, unknown>[] {
  if (!body || typeof body !== "object") return [];
  const record = body as Record<string, unknown>;
  for (const key of keys) {
    const value = record[key];
    if (Array.isArray(value)) return value.filter((item) => item && typeof item === "object") as Record<string, unknown>[];
  }
  return [];
}

function assertOk(body: Record<string, unknown>): void {
  const code = body.code != null ? String(body.code) : "";
  if (body.success === false || (code && code !== "1000000" && code !== "0")) {
    const message = String(body.msg || body.message || `Deye Cloud error ${code}`);
    const auth = /token|auth|unauthor|expire|login/i.test(message) || code.startsWith("2101");
    throw new DeyeError(message, code || undefined, auth);
  }
}

function normalizeExpires(expiresIn: unknown): number {
  const value = num(expiresIn);
  const sixtyDays = 60 * 24 * 3600;
  if (value == null) return sixtyDays;
  if (value > 1e12) return Math.max(3600, (value - Date.now()) / 1000);
  if (value > 1e9) return Math.max(3600, value - Date.now() / 1000);
  return Math.max(3600, value);
}

export function mapMeasurePoints(dataList: unknown): Record<string, number | string | null> {
  const mapped: Record<string, number | string | null> = {};
  if (!Array.isArray(dataList)) return mapped;
  for (const item of dataList) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const key = typeof row.key === "string" ? KEY_MAP[normKey(row.key)] : undefined;
    if (!key) continue;
    if (key === "mode" || key === "gridStatus" || key === "offGrid") mapped[key] = row.value == null ? null : String(row.value);
    else mapped[key] = num(row.value);
  }
  return mapped;
}

function gridStatusFrom(
  mapped: Record<string, number | string | null>,
  loadW: number,
  acV: number | null,
  gridW: number,
  acHz: number | null,
): GridStatus {
  const explicit = mapped.gridStatus != null ? String(mapped.gridStatus) : "";
  const off = mapped.offGrid != null ? String(mapped.offGrid) : "";
  const offNorm = normKey(off);
  const statusNorm = normKey(explicit);
  if (["1", "true", "off", "offgrid", "yes"].includes(offNorm) || statusNorm.includes("off")) return "off-grid";
  if (["0", "false", "on", "ongrid", "no"].includes(offNorm) || statusNorm.includes("on")) return "on-grid";
  if (gridW === 0 && (acHz === 0 || acHz == null || acV === 0)) return "off-grid";
  if (gridW !== 0 || (acHz != null && acHz > 0) || (acV != null && acV > 0)) return "on-grid";
  if (acV != null && acV < 50 && loadW > 50) return "off-grid";
  return "on-grid";
}

/** Daily energy keys, in priority order. DailyActiveProduction is PV-only (confirmed on live Deye hybrids).
 *  Generic DailyEnergy/DailyProduction can be a different, much smaller counter, so they come last.
 *  Lifetime Total* consumption keys are intentionally omitted from today's load.
 */
export const DAILY_PRODUCTION_KEYS = [
  "DailyActiveProduction",
  "DailyPVProduction",
  "DailyPVEnergy",
  "PVDailyEnergy",
  "DailyGeneration",
  "DailyProduction",
  "DailyEnergy",
  "TodayEnergy",
  "Etoday",
] as const;

export const DAILY_LOAD_KEYS = [
  "DailyConsumption",
  "DailyLoadConsumption",
  "DailyLodConsumption",
  "DailyLoadEnergy",
  "DailyLoad",
  "TodayConsumption",
] as const;

export const DAILY_CHARGE_KEYS = ["DailyChargingEnergy", "DailyChargeEnergy", "DailyCharging", "DailyCharge"] as const;
export const DAILY_DISCHARGE_KEYS = ["DailyDischargingEnergy", "DailyDischargeEnergy", "DailyDischarging", "DailyDischarge"] as const;
export const DAILY_IMPORT_KEYS = ["DailyEnergyPurchased", "DailyPurchasingEnergy", "DailyPurchase", "DailyImport"] as const;
export const DAILY_EXPORT_KEYS = ["DailyGridFeedIn", "DailySold", "DailySell", "DailyExport", "DailyGridFeedin"] as const;

export function valuesFromDataList(dataList: unknown): Map<string, number> {
  const values = new Map<string, number>();
  if (!Array.isArray(dataList)) return values;
  for (const item of dataList) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    if (typeof row.key !== "string") continue;
    const parsed = num(row.value);
    if (parsed == null) continue;
    values.set(normKey(row.key), parsed);
  }
  return values;
}

export function pickDataListValue(values: Map<string, number>, keys: readonly string[]): number | null {
  for (const key of keys) {
    const parsed = values.get(normKey(key));
    if (parsed != null && Number.isFinite(parsed)) return Math.max(0, parsed);
  }
  return null;
}

export function stationDailyHistoryRange(now: number, timeZone: string): { startAt: string; endAt: string } {
  // Inclusive end is tomorrow so Deye returns the in-progress today bucket.
  return {
    startAt: zonedParts(now - 28 * 86_400_000, timeZone).ymd,
    endAt: zonedParts(now + 86_400_000, timeZone).ymd,
  };
}

export function dailyEnergyFromDeye(deviceBody: unknown, stationBody: unknown): EnergyTotals | null {
  const device = asArray(deviceBody, ["deviceDataList", "deviceList", "list"])[0];
  const station = stationBody && typeof stationBody === "object" ? (stationBody as Record<string, unknown>) : null;
  const values = device ? valuesFromDataList(device.dataList) : new Map<string, number>();
  const pick = (keys: readonly string[], stationKey: string): number => {
    const fromList = pickDataListValue(values, keys);
    if (fromList != null) return fromList;
    if (station) {
      const fromStation = num(station[stationKey]);
      if (fromStation != null) return Math.max(0, fromStation);
    }
    return 0;
  };
  const totals: EnergyTotals = {
    productionKwh: pick(DAILY_PRODUCTION_KEYS, "generationValue"),
    loadKwh: pick(DAILY_LOAD_KEYS, "consumptionValue"),
    chargeKwh: pick(DAILY_CHARGE_KEYS, "chargeValue"),
    dischargeKwh: pick(DAILY_DISCHARGE_KEYS, "dischargeValue"),
    importKwh: pick(DAILY_IMPORT_KEYS, "purchaseValue"),
    exportKwh: pick(DAILY_EXPORT_KEYS, "gridValue"),
    socClose: pickDataListValue(values, ["SOC", "BatterySOC"]) ?? num(station?.batterySOC ?? station?.batterySoc),
  };
  const hasEnergy = totals.productionKwh + totals.loadKwh + totals.chargeKwh + totals.dischargeKwh + totals.importKwh + totals.exportKwh > 0;
  return hasEnergy ? totals : null;
}

export function sampleFromDeye(deviceBody: unknown, stationBody: unknown, fallbackTs = Date.now()): Sample {
  const device = asArray(deviceBody, ["deviceDataList", "deviceList", "list"])[0];
  const station = stationBody && typeof stationBody === "object" ? (stationBody as Record<string, unknown>) : null;
  if (!device && !station) throw new DeyeError("Deye Cloud returned no station or device telemetry");
  const mapped = device ? mapMeasurePoints(device.dataList) : {};
  const stationNum = (key: string) => (station ? num(station[key]) : null);
  const pvW = (typeof mapped.pvW === "number" ? mapped.pvW : null) ?? stationNum("generationPower") ?? 0;
  const loadW = (typeof mapped.loadW === "number" ? mapped.loadW : null) ?? stationNum("consumptionPower") ?? 0;
  // Deye BatteryPower / batteryPower is signed: negative = charging, positive = discharging. Keep the sign as-is.
  let batteryW = (typeof mapped.batteryW === "number" ? mapped.batteryW : null) ?? stationNum("batteryPower");
  if (batteryW == null) {
    const charge = stationNum("chargePower");
    const discharge = stationNum("dischargePower");
    if (charge != null || discharge != null) batteryW = (discharge ?? 0) - Math.abs(charge ?? 0);
    else batteryW = 0;
  }
  const soc = (typeof mapped.soc === "number" ? mapped.soc : null) ?? stationNum("batterySOC") ?? stationNum("batterySoc") ?? 0;
  let gridW = typeof mapped.gridW === "number" ? mapped.gridW : null;
  if (gridW == null) {
    const purchase = stationNum("purchasePower");
    const exported = stationNum("gridPower");
    const wire = stationNum("wirePower");
    if (purchase != null || exported != null) gridW = (purchase ?? 0) - (exported ?? 0);
    else gridW = wire ?? 0;
  }
  const acV = typeof mapped.acV === "number" ? mapped.acV : null;
  const acHz = typeof mapped.acHz === "number" ? mapped.acHz : null;
  const collection = device ? num(device.collectionTime) : null;
  const updated = station ? num(station.lastUpdateTime) : null;
  return {
    ts: epochMs(collection ?? updated, fallbackTs),
    source: "deye",
    pvW,
    loadW,
    gridW,
    gridStatus: gridStatusFrom(mapped, loadW, acV, gridW, acHz),
    batteryW,
    batterySoc: soc,
    batteryV: typeof mapped.batteryV === "number" ? mapped.batteryV : null,
    acV,
    acHz,
    operatingMode: labelMode(typeof mapped.mode === "string" ? mapped.mode : null),
    online: true,
  };
}

export function parseStations(body: unknown): DeyeStation[] {
  return asArray(body, ["stationList", "list", "data"]).map((row) => ({
    id: num(row.id) ?? 0,
    name: String(row.name || row.stationName || "Station"),
    lat: num(row.locationLat),
    lon: num(row.locationLng),
    timezone: row.regionTimezone != null ? String(row.regionTimezone) : null,
  }));
}

export function parseDevices(body: unknown): DeyeDevice[] {
  const rows: Record<string, unknown>[] = [
    ...asArray(body, ["deviceListItems", "deviceList", "list"]),
    ...asArray(body, ["stationList"]).flatMap((station) =>
      asArray(station, ["deviceListItems", "deviceList"]).map((device) => ({
        ...device,
        stationId: device.stationId ?? station.id,
      })),
    ),
  ];
  const seen = new Set<string>();
  const devices: DeyeDevice[] = [];
  for (const row of rows) {
    const sn = String(row.deviceSn || row.sn || "");
    if (!sn || seen.has(sn)) continue;
    seen.add(sn);
    devices.push({
      sn,
      stationId: num(row.stationId),
      model: row.productName != null ? String(row.productName) : row.deviceModel != null ? String(row.deviceModel) : null,
    });
  }
  return devices;
}

export function energyFromHistoryPoint(row: HistoryEnergyPoint): EnergyTotals {
  return {
    productionKwh: row.productionKwh ?? 0,
    loadKwh: row.loadKwh ?? 0,
    chargeKwh: row.chargeKwh ?? 0,
    dischargeKwh: row.dischargeKwh ?? 0,
    importKwh: row.importKwh ?? 0,
    exportKwh: row.exportKwh ?? 0,
    socClose: row.soc ?? null,
  };
}

export function parseStationHistory(body: unknown, granularity: number): HistoryEnergyPoint[] {
  const rows = asArray(body, ["stationDataItems", "dataList", "list", "items"]);
  const energy: HistoryEnergyPoint[] = [];
  for (const row of rows) {
    if (granularity <= 1) continue;
    const year = num(row.year);
    const month = num(row.month);
    const day = num(row.day);
    if (year == null || month == null) continue;
    const grain = granularity === 2 && day != null ? "day" : "month";
    const period =
      grain === "day"
        ? `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
        : `${year}-${String(month).padStart(2, "0")}`;
    energy.push({
      period,
      grain,
      productionKwh: num(row.generationValue) ?? undefined,
      loadKwh: num(row.consumptionValue) ?? undefined,
      chargeKwh: num(row.chargeValue) ?? undefined,
      dischargeKwh: num(row.dischargeValue) ?? undefined,
      importKwh: num(row.purchaseValue) ?? undefined,
      exportKwh: num(row.gridValue) ?? undefined,
      soc: num(row.batterySoc ?? row.batterySOC) ?? undefined,
    });
  }
  return energy;
}

export class DeyeClient {
  constructor(
    private readonly credentials: DeyeCredentials,
    private readonly tokens: {
      get: () => StoredToken | null;
      set: (token: StoredToken) => void;
    },
    private readonly poster: DeyePoster,
  ) {}

  baseUrl(): string {
    return resolveDeyeBaseUrl(this.credentials.region, this.credentials.baseUrl);
  }

  async accessToken(force = false): Promise<string> {
    const current = this.tokens.get();
    const refreshBy = Date.now() + 2 * 24 * 3600 * 1000;
    if (!force && current && current.expiresAt > refreshBy && current.token) return current.token;
    const fresh = await this.obtainToken();
    this.tokens.set(fresh);
    return fresh.token;
  }

  async obtainToken(): Promise<StoredToken> {
    if (!this.credentials.appId || !this.credentials.appSecret || !this.credentials.email || !this.credentials.password) {
      throw new DeyeError("App ID, app secret, email, and password are required");
    }
    const url = `${this.baseUrl()}/account/token?appId=${encodeURIComponent(this.credentials.appId)}`;
    const payload: Record<string, string> = {
      appSecret: this.credentials.appSecret,
      email: this.credentials.email.trim(),
      password: await deyePasswordField(this.credentials.password),
    };
    if (this.credentials.companyId && this.credentials.companyId !== "0") payload.companyId = this.credentials.companyId;
    const { status, body } = await this.poster(url, null, payload);
    this.assertHttp(status, body);
    const token = String(body.accessToken || body.token || "");
    if (!token) {
      throw new DeyeError(String(body.msg || "Deye Cloud did not return an access token"), body.code != null ? String(body.code) : undefined);
    }
    const obtainedAt = Date.now();
    return { token, obtainedAt, expiresAt: obtainedAt + normalizeExpires(body.expiresIn) * 1000 };
  }

  private assertHttp(status: number, body: Record<string, unknown>): void {
    if (status === 401 || status === 403) {
      throw new DeyeError(String(body.msg || `HTTP ${status}`), body.code != null ? String(body.code) : undefined, true);
    }
    if (status < 200 || status >= 300) {
      throw new DeyeError(String(body.msg || body.message || `HTTP ${status}`), body.code != null ? String(body.code) : undefined);
    }
    assertOk(body);
  }

  private async call(path: string, payload: unknown, retry = true): Promise<Record<string, unknown>> {
    const token = await this.accessToken();
    try {
      const { status, body } = await this.poster(`${this.baseUrl()}${path}`, token, payload);
      this.assertHttp(status, body);
      return body;
    } catch (error) {
      if (retry && error instanceof DeyeError && error.auth) {
        await this.accessToken(true);
        return this.call(path, payload, false);
      }
      throw error;
    }
  }

  async stationList(): Promise<DeyeStation[]> {
    const stations: DeyeStation[] = [];
    for (let page = 1; page <= 5; page += 1) {
      const body = await this.call("/station/list", { page, size: 20 });
      const batch = parseStations(body);
      stations.push(...batch);
      if (batch.length < 20) break;
    }
    return stations;
  }

  async deviceList(): Promise<DeyeDevice[]> {
    const body = await this.call("/station/listWithDevice", { page: 1, size: 50, deviceType: "INVERTER" });
    return parseDevices(body);
  }

  async stationLatest(stationId: number): Promise<Record<string, unknown>> {
    return this.call("/station/latest", { stationId });
  }

  async deviceLatest(deviceSn: string): Promise<Record<string, unknown>> {
    return this.call("/device/latest", { deviceList: [deviceSn] });
  }

  async stationHistory(stationId: number, granularity: number, startAt: string, endAt: string): Promise<Record<string, unknown>> {
    return this.call("/station/history", { stationId, granularity, startAt, endAt });
  }
}
