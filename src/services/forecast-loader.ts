import { onDeviceForecast, openMeteoForecastUrl, parseOpenMeteo } from "@/domain/weather";
import { getJson } from "@/platform/http";
import type { PlantProfile } from "@/domain/types";
import type { ForecastBundle } from "@/services/snapshot";

const CACHE_MS = 30 * 60_000;

export async function loadForecast(profile: PlantProfile, cache: { key: string; at: number; bundle: ForecastBundle } | null): Promise<{
  bundle: ForecastBundle;
  cache: { key: string; at: number; bundle: ForecastBundle };
}> {
  const key = `${profile.lat.toFixed(3)},${profile.lon.toFixed(3)},${profile.timeZone},${profile.ratedW}`;
  if (cache && cache.key === key && Date.now() - cache.at < CACHE_MS) return { bundle: cache.bundle, cache };
  try {
    const body = (await getJson(openMeteoForecastUrl(profile.lat, profile.lon, profile.timeZone))) as {
      current?: { temperature_2m?: number; weather_code?: number };
      daily?: Record<string, unknown>;
    };
    const parsed = parseOpenMeteo(body, profile.ratedW);
    if (!parsed.forecast) throw new Error("Forecast was empty");
    const bundle: ForecastBundle = {
      forecast: parsed.forecast,
      source: "open-meteo",
      tempC: parsed.current?.tempC ?? parsed.forecast.today.tempC,
      weatherLabel: parsed.current?.label ?? parsed.forecast.today.label,
    };
    const next = { key, at: Date.now(), bundle };
    return { bundle, cache: next };
  } catch {
    const bundle: ForecastBundle = {
      forecast: onDeviceForecast(Date.now(), profile.timeZone, profile.ratedW),
      source: "on-device",
      tempC: null,
      weatherLabel: null,
    };
    return { bundle, cache: { key, at: Date.now(), bundle } };
  }
}
