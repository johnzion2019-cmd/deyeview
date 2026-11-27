import { Capacitor, CapacitorHttp } from "@capacitor/core";
import { DeyeError, type DeyePoster, type DeyeResponse } from "@/domain/deye";

const PROXIES: Record<string, string> = {
  "https://eu1-developer.deyecloud.com": "/deye-eu",
  "https://us1-developer.deyecloud.com": "/deye-us",
  "https://api.open-meteo.com": "/meteo",
};

/** Browser preview cannot call Deye or Open-Meteo directly. The Vite proxy stands in. Native builds do not use it. */
export function browserProxyUrl(absolute: string): string {
  if (Capacitor.isNativePlatform()) return absolute;
  for (const [origin, prefix] of Object.entries(PROXIES)) {
    if (absolute.startsWith(origin)) return `${prefix}${absolute.slice(origin.length)}`;
  }
  return absolute;
}

function asBody(data: unknown, status: number): Record<string, unknown> {
  const parsed = typeof data === "string" ? safeParse(data) : data;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new DeyeError(`Deye Cloud returned non-JSON (HTTP ${status})`);
  }
  return parsed as Record<string, unknown>;
}

function safeParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export const postDeye: DeyePoster = async (url, token, payload): Promise<DeyeResponse> => {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `bearer ${token}`;
  try {
    if (Capacitor.isNativePlatform()) {
      const response = await CapacitorHttp.post({
        url,
        headers,
        data: payload,
        connectTimeout: 12_000,
        readTimeout: 20_000,
      });
      return { status: response.status, body: asBody(response.data, response.status) };
    }
    const response = await fetch(browserProxyUrl(url), {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });
    const text = await response.text();
    return { status: response.status, body: asBody(text, response.status) };
  } catch (error) {
    if (error instanceof DeyeError) throw error;
    const message = error instanceof Error ? error.message : "Network error";
    throw new DeyeError(`Deye Cloud request failed: ${message}`);
  }
};

export async function getJson(url: string): Promise<unknown> {
  if (Capacitor.isNativePlatform()) {
    const response = await CapacitorHttp.get({
      url,
      headers: { Accept: "application/json" },
      connectTimeout: 10_000,
      readTimeout: 15_000,
    });
    if (response.status < 200 || response.status >= 300) throw new Error(`Weather request failed (${response.status})`);
    return typeof response.data === "string" ? JSON.parse(response.data) : response.data;
  }
  const response = await fetch(browserProxyUrl(url), { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`Weather request failed (${response.status})`);
  return response.json();
}
