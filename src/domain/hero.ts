import { localHour } from "@/domain/time";

/** Daylight for the house hero: 6:00–16:59 local. Twilight and night use the night artwork. */
export const HERO_DAY_START_HOUR = 6;
export const HERO_DAY_END_HOUR = 17;

export type HeroPeriod = "day" | "night";

export function plantHeroPeriod(ts: number, timeZone: string): HeroPeriod {
  const hour = localHour(ts, timeZone);
  return hour >= HERO_DAY_START_HOUR && hour < HERO_DAY_END_HOUR ? "day" : "night";
}
