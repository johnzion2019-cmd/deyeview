/** Effective array size that maps a 20 MJ/m² day on a 16 kW hybrid to about 51 kWh. */
export const REFERENCE_RATED_W = 16_000;
export const EFFECTIVE_ARRAY_KW = 9.2;

export type ForecastDay = {
  ymd: string;
  shortwaveMj: number | null;
  cloudCoverPct: number | null;
  weatherCode: number;
  label: string;
  tempC: number | null;
  estKwh: number;
};

export type SolarForecast = {
  today: ForecastDay;
  tomorrow: ForecastDay;
  tip: string;
};

export function effectiveArrayKw(ratedW: number): number {
  const rated = Number.isFinite(ratedW) && ratedW > 0 ? ratedW : REFERENCE_RATED_W;
  return (rated / REFERENCE_RATED_W) * EFFECTIVE_ARRAY_KW;
}

export function estimateGenerationKwh(shortwaveMj: number, effectiveKw = EFFECTIVE_ARRAY_KW): number {
  if (!Number.isFinite(shortwaveMj) || shortwaveMj <= 0 || effectiveKw <= 0) return 0;
  const peakSunHours = shortwaveMj / 3.6;
  return Math.round(peakSunHours * effectiveKw * 10) / 10;
}

function skyCloudFallback(code: number): number {
  if (code === 0) return 10;
  if (code === 1) return 25;
  if (code === 2) return 50;
  if (code === 3) return 85;
  if (code >= 51) return 90;
  return 60;
}

export function estimateFromSky(weatherCode: number, cloudCoverPct: number | null, effectiveKw = EFFECTIVE_ARRAY_KW): number {
  const cloud = cloudCoverPct == null ? skyCloudFallback(weatherCode) : Math.min(100, Math.max(0, cloudCoverPct));
  const clearMj = 21;
  const mj = clearMj * (1 - 0.75 * (cloud / 100));
  return estimateGenerationKwh(mj, effectiveKw);
}

export function forecastTip(today: ForecastDay, tomorrow: ForecastDay, effectiveKw = EFFECTIVE_ARRAY_KW): string {
  const rainy = (code: number) => (code >= 51 && code <= 67) || (code >= 80 && code <= 82) || code >= 95;
  const specific = (day: ForecastDay) => (effectiveKw > 0 ? day.estKwh / effectiveKw : 0);
  const sunny = (day: ForecastDay) => specific(day) >= 4.8 && day.weatherCode <= 1 && (day.cloudCoverPct ?? 0) <= 35;
  const cloudy = (day: ForecastDay) => specific(day) < 3.6 || day.weatherCode >= 3 || (day.cloudCoverPct ?? 0) >= 60;

  if (rainy(tomorrow.weatherCode) || rainy(today.weatherCode)) {
    return "Rain in the forecast — leave a little extra in the battery overnight.";
  }
  if (sunny(tomorrow)) return "Sunny tomorrow — the battery should get a full recharge.";
  if (cloudy(tomorrow)) return "A cloudy day ahead — worth keeping the reserve higher tonight.";
  if (specific(tomorrow) >= 4.2) return "A solid solar day ahead.";
  return "A mixed sky — glance at the reserve before the evening peak.";
}

export function buildForecastDay(
  input: {
    ymd: string;
    shortwaveMj: number | null;
    cloudCoverPct: number | null;
    weatherCode: number;
    label: string;
    tempC: number | null;
  },
  effectiveKw = EFFECTIVE_ARRAY_KW,
): ForecastDay {
  const weatherCode = Number.isFinite(input.weatherCode) ? input.weatherCode : 2;
  const estKwh =
    input.shortwaveMj != null && input.shortwaveMj > 0
      ? estimateGenerationKwh(input.shortwaveMj, effectiveKw)
      : estimateFromSky(weatherCode, input.cloudCoverPct, effectiveKw);
  return {
    ymd: input.ymd,
    shortwaveMj: input.shortwaveMj,
    cloudCoverPct: input.cloudCoverPct,
    weatherCode,
    label: input.label,
    tempC: input.tempC,
    estKwh,
  };
}

export function buildSolarForecast(today: ForecastDay, tomorrow: ForecastDay, effectiveKw = EFFECTIVE_ARRAY_KW): SolarForecast {
  return { today, tomorrow, tip: forecastTip(today, tomorrow, effectiveKw) };
}
