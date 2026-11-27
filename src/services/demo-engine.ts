import { rollupMonths, addIntervalEnergy, buildDemoArchive } from "@/domain/archive";
import { emptyEnergy } from "@/domain/integrate";
import { chooseDemoClock, simulateStep } from "@/domain/demo";
import { simConfigFromProfile } from "@/domain/profile";
import { zonedParts } from "@/domain/time";
import type { EnergyTotals, PlantProfile, Sample } from "@/domain/types";
import type { EnergySnapshot } from "@/services/snapshot";

export class DemoEngine {
  private readonly zone: string;
  private readonly cfg: ReturnType<typeof simConfigFromProfile>;
  private readonly originReal: number;
  private readonly originVirtual: number;
  private readonly showcase: boolean;
  private lastVirtual: number;
  private soc: number;
  private days: Record<string, EnergyTotals>;
  private sample: Sample;

  constructor(profile: PlantProfile, realNow: number) {
    this.zone = profile.timeZone;
    this.cfg = simConfigFromProfile(profile);
    const clock = chooseDemoClock(realNow, profile.timeZone);
    this.originReal = realNow;
    this.originVirtual = clock.virtualNow;
    this.showcase = clock.showcase;
    const archive = buildDemoArchive(clock.virtualNow, this.cfg, 90);
    this.days = archive.days;
    this.soc = archive.soc;
    this.lastVirtual = clock.virtualNow;
    const painted = simulateStep(clock.virtualNow, archive.soc, 1 / 3600, this.cfg);
    this.sample = { ...painted.sample, batterySoc: archive.soc };
  }

  virtualNow(realNow: number): number {
    return this.originVirtual + (realNow - this.originReal);
  }

  tick(realNow: number): void {
    const virtual = this.virtualNow(realNow);
    const dtHours = (virtual - this.lastVirtual) / 3_600_000;
    if (dtHours <= 0) return;
    const previousYmd = zonedParts(this.lastVirtual, this.zone).ymd;
    const step = simulateStep(virtual, this.soc, dtHours, this.cfg);
    const ymd = zonedParts(virtual, this.zone).ymd;
    if (ymd !== previousYmd) this.days[ymd] = emptyEnergy();
    this.days[ymd] = addIntervalEnergy(this.days[ymd] ?? emptyEnergy(), step.sample, dtHours);
    this.soc = step.soc;
    this.sample = step.sample;
    this.lastVirtual = virtual;
  }

  view(realNow: number): EnergySnapshot {
    const now = this.virtualNow(realNow);
    const ymd = zonedParts(now, this.zone).ymd;
    return {
      sample: this.sample,
      now,
      today: this.days[ymd] ?? emptyEnergy(),
      days: this.days,
      months: rollupMonths(this.days),
      showcase: this.showcase,
    };
  }
}
