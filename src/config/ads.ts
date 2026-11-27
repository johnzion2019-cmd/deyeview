/**
 * AdMob ids for DeyeView (`com.deyeview.app`).
 *
 * The values below are Google's official SAMPLE ids. They always request test ads.
 * https://developers.google.com/admob/android/test-ads
 * https://developers.google.com/admob/ios/test-ads
 *
 * When a real AdMob account exists, paste the live ids in either place:
 * 1. Replace the constants in this file, or
 * 2. Set the `VITE_ADMOB_*` variables (see `.env.example`) and run `npm run build`.
 *    App ids are copied into `AndroidManifest` / `strings.xml` and `Info.plist`.
 *    Banner ids are read from this module at build time. The native app id and the
 *    id in this file must match or the Google Mobile Ads SDK will not serve.
 *
 * Do not ship a store build that still uses the sample ids once the AdMob account
 * is approved. Sample ids are safe for local and closed testing.
 */

export const GOOGLE_TEST_APP_IDS = {
  android: "ca-app-pub-3940256099942544~3347511713",
  ios: "ca-app-pub-3940256099942544~1458002511",
} as const;

/** Official adaptive-banner test units. Android and iOS use different units. */
export const GOOGLE_TEST_BANNER_IDS = {
  android: "ca-app-pub-3940256099942544/6300978111",
  ios: "ca-app-pub-3940256099942544/2934735716",
} as const;

export const ADMOB_ENV = {
  androidAppId: "VITE_ADMOB_ANDROID_APP_ID",
  iosAppId: "VITE_ADMOB_IOS_APP_ID",
  androidBannerId: "VITE_ADMOB_ANDROID_BANNER_ID",
  iosBannerId: "VITE_ADMOB_IOS_BANNER_ID",
  debugGeography: "VITE_ADMOB_DEBUG_GEOGRAPHY",
  testDeviceIds: "VITE_ADMOB_TEST_DEVICE_IDS",
} as const;

/**
 * How many taps on the Settings version line reveal the developer ads switch.
 * There is no purchase flow. The switch only writes `adsEnabled` on this device.
 */
export const ADS_DEV_TOGGLE_TAPS = 7;

/** Used only when the SDK reports a load without a size. Anchored banners are at least this tall. */
export const FALLBACK_BANNER_HEIGHT_PX = 50;

export interface AdMobIds {
  androidAppId: string;
  iosAppId: string;
  androidBannerId: string;
  iosBannerId: string;
}

export type AdsPlatform = "android" | "ios" | "web";

export type TrackingChoice = "authorized" | "denied" | "notDetermined" | "restricted" | "unavailable";

export type ConsentChoice = "NOT_REQUIRED" | "OBTAINED" | "REQUIRED" | "UNKNOWN";

/**
 * Future Pro purchase sets `adsEnabled` to false and the dashboard stops requesting a banner.
 * Nothing is for sale yet. The hidden developer switch is the only writer.
 */
export interface AdsPreference {
  adsEnabled: boolean;
}

export const DEFAULT_ADS_PREFERENCE: AdsPreference = {
  adsEnabled: true,
};

export type EnvMap = Record<string, string | boolean | undefined>;

export function envString(env: EnvMap, key: string): string | undefined {
  const raw = env[key];
  if (typeof raw !== "string") return undefined;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function resolveAdMobIds(env: EnvMap = import.meta.env): AdMobIds {
  return {
    androidAppId: envString(env, ADMOB_ENV.androidAppId) ?? GOOGLE_TEST_APP_IDS.android,
    iosAppId: envString(env, ADMOB_ENV.iosAppId) ?? GOOGLE_TEST_APP_IDS.ios,
    androidBannerId: envString(env, ADMOB_ENV.androidBannerId) ?? GOOGLE_TEST_BANNER_IDS.android,
    iosBannerId: envString(env, ADMOB_ENV.iosBannerId) ?? GOOGLE_TEST_BANNER_IDS.ios,
  };
}

export function usesOfficialGoogleTestIds(ids: AdMobIds = resolveAdMobIds()): boolean {
  return (
    ids.androidAppId === GOOGLE_TEST_APP_IDS.android &&
    ids.iosAppId === GOOGLE_TEST_APP_IDS.ios &&
    ids.androidBannerId === GOOGLE_TEST_BANNER_IDS.android &&
    ids.iosBannerId === GOOGLE_TEST_BANNER_IDS.ios
  );
}

export function adsPlatform(platform: string): AdsPlatform {
  if (platform === "android" || platform === "ios") return platform;
  return "web";
}

export function bannerAdUnitId(platform: AdsPlatform, ids: AdMobIds = resolveAdMobIds()): string | null {
  if (platform === "android") return ids.androidBannerId;
  if (platform === "ios") return ids.iosBannerId;
  return null;
}

/** Web, welcome, settings, and legal pages must not mount a banner. */
export function shouldShowDashboardBanner(input: { platform: AdsPlatform; adsEnabled: boolean }): boolean {
  return input.adsEnabled && input.platform !== "web";
}

/**
 * Personalized ads require a UMP status of obtained or not-required.
 * On iOS they also require App Tracking Transparency to be authorized.
 * A decline, a restriction, or an unknown consent state sends a non-personalized request (`npa`).
 * When UMP status is obtained, the Google SDK still applies the saved consent string.
 */
export function serveNonPersonalizedAds(input: { platform: AdsPlatform; tracking: TrackingChoice; consent: ConsentChoice }): boolean {
  if (input.platform === "ios" && input.tracking !== "authorized") return true;
  if (input.consent === "OBTAINED" || input.consent === "NOT_REQUIRED") return false;
  return true;
}

export function bannerReservePx(heightPx: number): number {
  if (!Number.isFinite(heightPx) || heightPx <= 0) return 0;
  return Math.round(heightPx);
}

export function normalizeAdsPreference(value: unknown): AdsPreference {
  if (!value || typeof value !== "object") return { ...DEFAULT_ADS_PREFERENCE };
  const adsEnabled = (value as { adsEnabled?: unknown }).adsEnabled;
  if (typeof adsEnabled !== "boolean") return { ...DEFAULT_ADS_PREFERENCE };
  return { adsEnabled };
}

export interface ConsentDebugOverride {
  geography: "DISABLED" | "EEA" | "US" | "OTHER";
  testDeviceIds: string[];
}

export function consentDebugOverride(env: EnvMap = import.meta.env): ConsentDebugOverride | undefined {
  const geography = envString(env, ADMOB_ENV.debugGeography)?.toUpperCase();
  const devices = envString(env, ADMOB_ENV.testDeviceIds);
  const testDeviceIds = devices
    ? devices
        .split(",")
        .map((item) => item.trim())
        .filter((item) => item.length > 0)
    : [];
  const allowed = new Set(["DISABLED", "EEA", "US", "OTHER"]);
  const known = geography && allowed.has(geography) ? (geography as ConsentDebugOverride["geography"]) : undefined;
  if (!known && testDeviceIds.length === 0) return undefined;
  return { geography: known ?? "DISABLED", testDeviceIds };
}
