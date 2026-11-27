import { buildForecastDay, buildSolarForecast, effectiveArrayKw, type ForecastDay, type SolarForecast } from "@/domain/forecast";
import { hash01, hashString } from "@/domain/demo";
import { addZonedDays, zonedParts } from "@/domain/time";

export type WeatherNow = {
  tempC: number;
  code: number;
  label: string;
};

export function weatherLabel(code: number): string {
  if (code === 0) return "Clear";
  if (code === 1) return "Mainly clear";
  if (code === 2) return "Partly cloudy";
  if (code === 3) return "Overcast";
  if (code >= 45 && code <= 48) return "Fog";
  if (code >= 51 && code <= 57) return "Drizzle";
  if (code >= 61 && code <= 67) return "Rain";
  if (code >= 71 && code <= 77) return "Snow";
  if (code >= 80 && code <= 82) return "Showers";
  if (code >= 95) return "Thunderstorm";
  return "Mixed sky";
}

function num(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function dailyValue(block: Record<string, unknown> | undefined, key: string, index: number): number | null {
  const series = block?.[key];
  if (!Array.isArray(series)) return null;
  return num(series[index]);
}

export function parseOpenMeteo(
  body: {
    current?: { temperature_2m?: number; weather_code?: number };
    daily?: Record<string, unknown>;
  },
  ratedW: number,
): { current: WeatherNow | null; forecast: SolarForecast | null } {
  const temp = body.current?.temperature_2m;
  const code = Number(body.current?.weather_code ?? 0);
  const current: WeatherNow | null = typeof temp === "number" ? { tempC: temp, code, label: weatherLabel(code) } : null;
  const daily = body.daily;
  const days = Array.isArray(daily?.time) ? (daily.time as unknown[]) : [];
  const kw = effectiveArrayKw(ratedW);
  const parsed = days.slice(0, 2).map((ymd, index) => {
    const weatherCode = dailyValue(daily, "weather_code", index) ?? 2;
    return buildForecastDay(
      {
        ymd: String(ymd),
        shortwaveMj: dailyValue(daily, "shortwave_radiation_sum", index),
        cloudCoverPct: dailyValue(daily, "cloud_cover_mean", index),
        weatherCode,
        label: weatherLabel(weatherCode),
        tempC: dailyValue(daily, "temperature_2m_max", index),
      },
      kw,
    );
  });
  const forecast = parsed.length >= 2 ? buildSolarForecast(parsed[0], parsed[1], kw) : parsed.length === 1 ? buildSolarForecast(parsed[0], parsed[0], kw) : null;
  return { current, forecast };
}

export function openMeteoForecastUrl(lat: number, lon: number, timeZone: string): string {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", lat.toFixed(4));
  url.searchParams.set("longitude", lon.toFixed(4));
  url.searchParams.set("current", "temperature_2m,weather_code");
  url.searchParams.set("daily", "shortwave_radiation_sum,cloud_cover_mean,weather_code,temperature_2m_max,temperature_2m_min");
  url.searchParams.set("forecast_days", "3");
  url.searchParams.set("timezone", timeZone);
  return url.toString();
}

function syntheticDay(ymd: string, ratedW: number): ForecastDay {
  const cloud = Math.round(18 + hash01(hashString(`sky:${ymd}`)) * 62);
  const code = cloud < 28 ? 1 : cloud < 55 ? 2 : cloud < 78 ? 3 : 61;
  return buildForecastDay(
    {
      ymd,
      shortwaveMj: null,
      cloudCoverPct: cloud,
      weatherCode: code,
      label: weatherLabel(code),
      tempC: null,
    },
    effectiveArrayKw(ratedW),
  );
}

/** Stable per-day estimate used when Open-Meteo cannot be reached. */
export function onDeviceForecast(now: number, timeZone: string, ratedW: number): SolarForecast {
  const todayYmd = zonedParts(now, timeZone).ymd;
  const tomorrowYmd = zonedParts(addZonedDays(now, timeZone, 1), timeZone).ymd;
  const kw = effectiveArrayKw(ratedW);
  return buildSolarForecast(syntheticDay(todayYmd, ratedW), syntheticDay(tomorrowYmd, ratedW), kw);
}
