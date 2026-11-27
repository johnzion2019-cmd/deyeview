import { DeyeClient, dailyEnergyFromDeye, energyFromHistoryPoint, parseStationHistory, sampleFromDeye } from "@/domain/deye";
import { emptyEnergy, mergeEnergyTotals } from "@/domain/integrate";
import { postDeye } from "@/platform/http";
import { zonedParts } from "@/domain/time";
import type { EnergyTotals, PlantProfile, StoredToken } from "@/domain/types";
import type { EnergySnapshot } from "@/services/snapshot";

export type LiveResult = {
  profile: PlantProfile;
  snapshot: EnergySnapshot;
};

export async function fetchLiveSnapshot(profile: PlantProfile): Promise<LiveResult> {
  let token: StoredToken | null = profile.token;
  const client = new DeyeClient(
    {
      region: profile.region,
      appId: profile.appId,
      appSecret: profile.appSecret,
      email: profile.email,
      password: profile.password,
      companyId: profile.companyId || undefined,
      deviceSn: profile.deviceSn,
      stationId: profile.stationId || undefined,
    },
    {
      get: () => token,
      set: (next) => {
        token = next;
      },
    },
    postDeye,
  );

  let stationId = profile.stationId;
  if (!stationId) {
    const devices = await client.deviceList();
    const match = devices.find((device) => device.sn.toLowerCase() === profile.deviceSn.toLowerCase());
    if (match?.stationId) stationId = String(match.stationId);
    if (!stationId) {
      const stations = await client.stationList();
      if (stations.length === 1) stationId = String(stations[0].id);
    }
  }

  const deviceBody = await client.deviceLatest(profile.deviceSn);
  let stationBody: Record<string, unknown> | null = null;
  if (stationId) {
    try {
      stationBody = await client.stationLatest(Number(stationId));
    } catch {
      stationBody = null;
    }
  }
  const sample = sampleFromDeye(deviceBody, stationBody);
  const todayFromDevice = dailyEnergyFromDeye(deviceBody, stationBody);
  const days: Record<string, EnergyTotals> = {};
  const months: Record<string, EnergyTotals> = {};
  const now = Date.now();
  const todayYmd = zonedParts(now, profile.timeZone).ymd;

  if (stationId) {
    const start = zonedParts(now - 29 * 86_400_000, profile.timeZone).ymd;
    try {
      const daily = await client.stationHistory(Number(stationId), 2, start, todayYmd);
      for (const row of parseStationHistory(daily, 2)) {
        if (row.grain === "day") days[row.period] = energyFromHistoryPoint(row);
      }
    } catch {
      /* A live reading is still useful if history is delayed. */
    }
    try {
      const monthStart = zonedParts(now - 370 * 86_400_000, profile.timeZone).ymd.slice(0, 7);
      const monthly = await client.stationHistory(Number(stationId), 3, monthStart, todayYmd.slice(0, 7));
      for (const row of parseStationHistory(monthly, 3)) {
        if (row.grain === "month") months[row.period] = energyFromHistoryPoint(row);
      }
    } catch {
      /* Monthly history is optional. */
    }
  }

  const today = mergeEnergyTotals(todayFromDevice ?? days[todayYmd] ?? emptyEnergy(), days[todayYmd] ?? null);
  days[todayYmd] = today;

  return {
    profile: { ...profile, token, stationId },
    snapshot: {
      sample,
      now,
      today,
      days,
      months,
      showcase: false,
    },
  };
}
