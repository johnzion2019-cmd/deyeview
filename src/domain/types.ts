export type RegionId = "eu" | "us";

export type GridStatus = "on-grid" | "off-grid";

export type SampleSource = "demo" | "deye";

export type Sample = {
  ts: number;
  source: SampleSource;
  pvW: number;
  pv1V: number | null;
  pv1A: number | null;
  pv1W: number | null;
  pv2V: number | null;
  pv2A: number | null;
  pv2W: number | null;
  pv3V: number | null;
  pv3A: number | null;
  pv3W: number | null;
  loadW: number;
  gridW: number;
  gridStatus: GridStatus;
  batteryW: number;
  batterySoc: number;
  batteryV: number | null;
  acV: number | null;
  acHz: number | null;
  operatingMode: string;
  online: boolean;
};

export type EnergyTotals = {
  productionKwh: number;
  loadKwh: number;
  chargeKwh: number;
  dischargeKwh: number;
  importKwh: number;
  exportKwh: number;
  socClose: number | null;
};

export type SceneMode = "auto" | "day" | "night";

export type StoredToken = {
  token: string;
  obtainedAt: number;
  expiresAt: number;
};

/** Everything DeyeView keeps on the device. Nothing here is sent to a DeyeView server. */
export type PlantProfile = {
  version: 1;
  mode: SampleSource;
  plantName: string;
  region: RegionId;
  appId: string;
  appSecret: string;
  email: string;
  password: string;
  companyId: string;
  deviceSn: string;
  stationId: string;
  currency: string;
  ratePerKwh: number;
  feedInRate: number;
  billingCycleDay: number;
  batteryKwh: number;
  ratedW: number;
  reserveSoc: number;
  systemCost: number;
  city: string;
  lat: number;
  lon: number;
  timeZone: string;
  scene: SceneMode;
  housePhoto: string | null;
  token: StoredToken | null;
};
