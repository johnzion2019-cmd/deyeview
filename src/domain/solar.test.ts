import { describe, expect, it } from "vitest";
import { buildDemoArchive } from "@/domain/archive";
import { cycleStartDayInMonth, cycleWindow } from "@/domain/billing";
import { batteryFlowState, estimateBatteryRuntime, formatBatteryChip, formatBatteryPower } from "@/domain/battery";
import { buildEarningsCsv, csvFilename } from "@/domain/csv";
import { chooseDemoClock, pvPowerW, type SimConfig } from "@/domain/demo";
import { DeyeClient, dailyEnergyFromDeye, mapMeasurePoints, parseStationHistory, resolveDeyeBaseUrl, sampleFromDeye, stationDailyHistoryRange } from "@/domain/deye";
import { formatKw } from "@/domain/format";
import { hasPvStringData, pvStringsFromSample, stringPowerWatts } from "@/domain/pv-strings";
import { buildEarningsReport, dayEarnings, selfSuppliedKwh } from "@/domain/earnings";
import { estimateGenerationKwh } from "@/domain/forecast";
import { formatMoney } from "@/domain/format";
import { deyePasswordField, hashDeyePassword } from "@/domain/password";
import { buildPayback } from "@/domain/payback";
import { buildPlantRecords } from "@/domain/records";
import { emptyEnergy, integrateSamples } from "@/domain/integrate";
import { zonedTimeToUtc } from "@/domain/time";
import type { EnergyTotals } from "@/domain/types";

const cfg: SimConfig = {
  timeZone: "Asia/Manila",
  lat: 9.3068,
  lon: 123.3054,
  ratedW: 8000,
  batteryKwh: 10,
  operatingMode: "Self Use",
  nominalHz: 60,
};

function energy(partial: Partial<EnergyTotals>): EnergyTotals {
  return { ...emptyEnergy(), ...partial };
}

describe("Deye password", () => {
  it("hashes a plaintext password as lowercase sha-256", async () => {
    await expect(hashDeyePassword("password")).resolves.toBe("5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8");
  });

  it("keeps a pasted digest", async () => {
    const digest = "5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8";
    await expect(deyePasswordField(digest.toUpperCase())).resolves.toBe(digest);
  });
});

describe("savings", () => {
  it("counts load that did not come from the grid", () => {
    expect(selfSuppliedKwh(energy({ loadKwh: 10, importKwh: 3 }))).toBe(7);
    expect(selfSuppliedKwh(energy({ productionKwh: 8, exportKwh: 2 }))).toBe(6);
    expect(selfSuppliedKwh(energy({ dischargeKwh: 4 }))).toBe(4);
  });

  it("prices self-supplied energy at the tariff and export at the feed-in rate", () => {
    const earned = dayEarnings(energy({ loadKwh: 10, importKwh: 3, exportKwh: 2 }), 16.5, 2);
    expect(earned.consumptionSavings).toBe(115.5);
    expect(earned.feedInEarnings).toBe(4);
    expect(earned.total).toBe(119.5);
  });
});


describe("battery flow sign convention", () => {
  it("treats negative Deye BatteryPower as charging and formats the hero chip", () => {
    const charging = sampleFromDeye(
      {
        deviceDataList: [
          {
            dataList: [
              { key: "SOC", value: "59" },
              { key: "BatteryPower", value: "-2080" },
              { key: "TotalSolarPower", value: "8540" },
              { key: "TotalConsumptionPower", value: "6230" },
              { key: "TotalGridPower", value: "0" },
            ],
          },
        ],
      },
      null,
    );
    expect(charging.batteryW).toBe(-2080);
    expect(formatBatteryChip(charging.batteryW, charging.batterySoc)).toEqual({
      label: "Charging",
      value: "2.08 kW · 59%",
      state: "charging",
    });
    expect(formatBatteryPower(-2080)).toBe("Charging 2.08 kW");
    expect(formatBatteryChip(1200, 59)).toEqual({
      label: "Discharging",
      value: "1.20 kW · 59%",
      state: "discharging",
    });
    expect(batteryFlowState(-49)).toBe("idle");
    expect(batteryFlowState(50)).toBe("discharging");
    expect(formatBatteryChip(0, 59)).toEqual({ label: "Idle", value: "59%", state: "idle" });
  });

  it("adds negative battery power to daily charge and positive power to discharge", () => {
    const hour = 3_600_000;
    const totals = integrateSamples([
      { ts: 0, pvW: 8000, loadW: 6000, batteryW: -2000, gridW: 0, batterySoc: 50 },
      { ts: hour, pvW: 0, loadW: 1000, batteryW: 1000, gridW: 0, batterySoc: 60 },
    ], 2 * hour);
    expect(totals.chargeKwh).toBeCloseTo(2, 5);
    expect(totals.dischargeKwh).toBeCloseTo(1, 5);
  });
});

describe("battery runtime", () => {
  it("estimates hours to reserve while discharging", () => {
    const runtime = estimateBatteryRuntime({ batteryKwh: 10, soc: 60, batteryW: 500, reserveSoc: 20 });
    expect(runtime.state).toBe("discharging");
    expect(runtime.hoursToReserve).toBeCloseTo(8, 5);
  });

  it("estimates hours to full while charging", () => {
    const runtime = estimateBatteryRuntime({ batteryKwh: 10, soc: 50, batteryW: -1000, reserveSoc: 20 });
    expect(runtime.state).toBe("charging");
    expect(runtime.hoursToFull).toBeCloseTo(5, 5);
    expect(runtime.label).toContain("100%");
  });

  it("stands by when power is near zero", () => {
    expect(estimateBatteryRuntime({ batteryKwh: 10, soc: 40, batteryW: 10 }).state).toBe("standby");
  });

  it("reports the reserve when the pack is already there", () => {
    expect(estimateBatteryRuntime({ batteryKwh: 10, soc: 15, batteryW: 400, reserveSoc: 20 }).state).toBe("at-reserve");
  });
});

describe("forecast and payback", () => {
  it("turns a clear 20 MJ day on a 16 kW hybrid into about 51 kWh", () => {
    expect(estimateGenerationKwh(20)).toBe(51.1);
  });

  it("projects the month the install cost is covered", () => {
    const payback = buildPayback({
      systemCost: 1000,
      lifetimeTotal: 250,
      monthly: [{ total: 100 }, { total: 150 }],
      now: Date.UTC(2026, 5, 1),
      timeZone: "UTC",
    });
    expect(payback.remaining).toBe(750);
    expect(payback.paidOffPct).toBe(25);
    expect(payback.monthsToBreakEven).toBeCloseTo(6, 5);
    expect(payback.breakEvenLabel).toBeTruthy();
  });
});

describe("records, csv, and billing", () => {
  it("picks the best production day and the best earning month", () => {
    const report = buildEarningsReport({
      today: energy({ productionKwh: 10, loadKwh: 8, importKwh: 1 }),
      tariff: 10,
      now: Date.parse("2026-06-15T04:00:00Z"),
      timeZone: "UTC",
      liveDays: {
        "2026-06-14": energy({ productionKwh: 22, loadKwh: 12, importKwh: 1 }),
        "2026-06-15": energy({ productionKwh: 10, loadKwh: 8, importKwh: 1 }),
        "2026-05-02": energy({ productionKwh: 4, loadKwh: 4 }),
      },
    });
    const records = buildPlantRecords(report.daily, report.monthly);
    expect(records.bestDay?.period).toBe("2026-06-14");
    expect(records.bestMonth?.period).toBe("2026-06");
    expect(records.average?.days).toBe(3);
  });

  it("quotes csv cells that contain commas", () => {
    const report = buildEarningsReport({
      today: energy({ loadKwh: 1 }),
      tariff: 1,
      now: Date.parse("2026-01-02T00:00:00Z"),
      timeZone: "UTC",
    });
    const csv = buildEarningsCsv(report, "USD", 'Harbor, "House"');
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain('"Harbor, ""House"""');
    expect(csvFilename("2026-01-02")).toBe("deyeview-report-2026-01-02.csv");
  });

  it("clamps a 31st billing day in February", () => {
    expect(cycleStartDayInMonth(2026, 2, 31)).toBe(28);
    const window = cycleWindow(Date.parse("2026-03-10T02:00:00Z"), "UTC", 31);
    expect(window.startYmd.endsWith("-28") || window.startYmd.endsWith("-31") || window.startYmd.endsWith("-01")).toBe(true);
    expect(window.daysElapsed).toBeGreaterThan(0);
  });
});

describe("demo sun and Deye parsing", () => {
  it("is dark before dawn and producing near solar noon", () => {
    const night = zonedTimeToUtc({ year: 2026, month: 6, day: 15, hour: 2, minute: 0 }, "Asia/Manila");
    const noon = zonedTimeToUtc({ year: 2026, month: 6, day: 15, hour: 11, minute: 45 }, "Asia/Manila");
    expect(pvPowerW(night, cfg)).toBe(0);
    expect(pvPowerW(noon, cfg)).toBeGreaterThan(2500);
  });

  it("parks a nighttime review on a sunny late morning", () => {
    const night = zonedTimeToUtc({ year: 2026, month: 6, day: 15, hour: 22, minute: 0 }, "Asia/Manila");
    const clock = chooseDemoClock(night, "Asia/Manila");
    expect(clock.showcase).toBe(true);
    expect(pvPowerW(clock.virtualNow, cfg)).toBeGreaterThan(2000);
  });

  it("builds a month of daily history with generation", () => {
    const noon = zonedTimeToUtc({ year: 2026, month: 6, day: 15, hour: 12, minute: 0 }, "Asia/Manila");
    const archive = buildDemoArchive(noon, cfg, 30);
    const days = Object.keys(archive.days);
    expect(days.length).toBeGreaterThanOrEqual(30);
    const produced = Object.values(archive.days).reduce((sum, day) => sum + day.productionKwh, 0);
    expect(produced).toBeGreaterThan(100);
    expect(archive.months["2026-06"]?.productionKwh).toBeGreaterThan(0);
  });

  it("maps device measure points and refuses private base urls", () => {
    const mapped = mapMeasurePoints([
      { key: "TotalSolarPower", value: "1800" },
      { key: "SOC", value: 63 },
      { key: "BatteryPower", value: -400 },
      { key: "TotalGridPower", value: 120 },
      { key: "TotalConsumptionPower", value: 900 },
    ]);
    expect(mapped.pvW).toBe(1800);
    expect(mapped.soc).toBe(63);
    expect(mapped.batteryW).toBe(-400);
    const sample = sampleFromDeye({ deviceDataList: [{ dataList: [{ key: "SOC", value: 63 }, { key: "TotalSolarPower", value: 10 }] }] }, null);
    expect(sample.batterySoc).toBe(63);
    expect(sample.source).toBe("deye");
    const today = dailyEnergyFromDeye(
      { deviceDataList: [{ dataList: [{ key: "DailyEnergy", value: 12.5 }, { key: "DailyConsumption", value: 9 }] }] },
      null,
    );
    expect(today?.productionKwh).toBe(12.5);
    expect(today?.loadKwh).toBe(9);
    const history = parseStationHistory(
      { stationDataItems: [{ year: 2026, month: 6, day: 2, generationValue: 18.2, consumptionValue: 11 }] },
      2,
    );
    expect(history[0]?.period).toBe("2026-06-02");
    expect(resolveDeyeBaseUrl("eu")).toBe("https://eu1-developer.deyecloud.com/v1.0");
    expect(resolveDeyeBaseUrl("us")).toBe("https://us1-developer.deyecloud.com/v1.0");
    expect(() => resolveDeyeBaseUrl("custom", "http://eu1-developer.deyecloud.com")).toThrow(/https/);
    expect(() => resolveDeyeBaseUrl("custom", "https://127.0.0.1/v1.0")).toThrow(/public/);
  });


  it("maps DC Power PV keys and falls back to V × A for string watts", () => {
    const official = sampleFromDeye(
      {
        deviceDataList: [
          {
            dataList: [
              { key: "DC Voltage PV1", value: "328.0" },
              { key: "DC Current PV1", value: "10.50" },
              { key: "DC Power PV1", value: "3500" },
              { key: "DC Voltage PV2", value: "325.4" },
              { key: "DC Current PV2", value: "10.40" },
              { key: "DC Voltage PV3", value: "321.0" },
              { key: "DC Current PV3", value: "18.20" },
              { key: "DC Power PV3", value: "5842" },
              { key: "TotalSolarPower", value: "12674" },
            ],
          },
        ],
      },
      null,
    );
    expect(official.pv1W).toBe(3500);
    expect(official.pv2W).toBeCloseTo(325.4 * 10.4);
    expect(official.pv3W).toBe(5842);

    const computed = sampleFromDeye(
      {
        deviceDataList: [
          {
            dataList: [
              { key: "PV1Voltage", value: "328.0" },
              { key: "PV1Current", value: "10.50" },
              { key: "PV2Voltage", value: "325.4" },
              { key: "PV2Current", value: "10.40" },
              { key: "PV3Voltage", value: "0" },
              { key: "PV3Current", value: "0" },
            ],
          },
        ],
      },
      null,
    );
    expect(computed.pv1W).toBeCloseTo(3444);
    expect(computed.pv2W).toBeCloseTo(3384.16);
    expect(computed.pv3W).toBe(0);
    expect(formatKw(computed.pv1W!)).toBe("3.44 kW");
    expect(formatKw(0)).toBe("0.00 kW");
    expect(pvStringsFromSample(computed).map((row) => row.name)).toEqual(["PV1", "PV2", "PV3"]);
    expect(hasPvStringData(0, 0, 0)).toBe(true);
    expect(hasPvStringData(null, null, null)).toBe(false);
    expect(stringPowerWatts(null, 328.0, 10.5)).toBeCloseTo(3444);
    expect(stringPowerWatts(3500, 328.0, 10.5)).toBe(3500);
  });



  it("prefers DailyActiveProduction for today's PV and ignores lifetime consumption", () => {
    const daily = dailyEnergyFromDeye(
      {
        deviceDataList: [
          {
            dataList: [
              { key: "SOC", value: "59" },
              { key: "DailyEnergy", value: "2.2" },
              { key: "DailyProduction", value: "2.2" },
              { key: "DailyActiveProduction", value: "41.7" },
              { key: "DailyChargingEnergy", value: "13.6" },
              { key: "DailyDischargingEnergy", value: "6.4" },
              { key: "DailyConsumption", value: "34.5" },
              { key: "TotalConsumption", value: "15475" },
              { key: "DailyEnergyPurchased", value: "0" },
              { key: "DailyGridFeedIn", value: "0" },
            ],
          },
        ],
      },
      null,
    );
    expect(daily).toMatchObject({
      productionKwh: 41.7,
      loadKwh: 34.5,
      chargeKwh: 13.6,
      dischargeKwh: 6.4,
      importKwh: 0,
      exportKwh: 0,
      socClose: 59,
    });
    const sources = daily!.productionKwh + daily!.dischargeKwh + daily!.importKwh;
    const sinks = daily!.loadKwh + daily!.chargeKwh + daily!.exportKwh;
    expect(Math.abs(sources - sinks)).toBeLessThan(1);
  });

  it("ends the daily station history window tomorrow so today is included", () => {
    const now = Date.UTC(2026, 10, 28, 3, 55, 0);
    const range = stationDailyHistoryRange(now, "Asia/Manila");
    expect(range.startAt).toBe("2026-10-31");
    expect(range.endAt).toBe("2026-11-29");
  });


  it("posts the hashed password to the token endpoint", async () => {
    let posted = "";
    let url = "";
    const client = new DeyeClient(
      { region: "eu", appId: "app", appSecret: "secret", email: "owner@example.com", password: "password" },
      { get: () => null, set: () => undefined },
      async (target, _token, payload) => {
        url = target;
        posted = String((payload as { password: string }).password);
        return { status: 200, body: { success: true, accessToken: "tok", expiresIn: 3600 } };
      },
    );
    const token = await client.obtainToken();
    expect(url).toContain("https://eu1-developer.deyecloud.com/v1.0/account/token?appId=app");
    expect(posted).toBe("5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8");
    expect(token.token).toBe("tok");
  });
});

describe("money format", () => {
  it("formats pesos and dollars", () => {
    expect(formatMoney(16.5, "PHP")).toContain("16.50");
    expect(formatMoney(16.5, "USD")).toContain("16.50");
  });
});
