/**
 * AdMob ids for DeyeView (`com.deyeview.app`).
 *
 * Release defaults are the live DeyeView AdMob apps (publisher `pub-7582636626157081`).
 * `npm run build` copies the app ids into `strings.xml` and `Info.plist`.
 * Banner units are chosen at runtime: release builds request the live "Dashboard banner"
 * units; debug builds, the hidden test-ads switch, and `VITE_ADMOB_FORCE_TEST_ADS` request
 * Google's sample banner units so development never clicks a live ad.
 * https://developers.google.com/admob/android/test-ads
 * https://developers.google.com/admob/ios/test-ads
 *
 * Override any id with `VITE_ADMOB_*` (see `.env.example`) and rebuild.
 * The native app id and the app id in this file must match or the SDK will not serve.
 * `VITE_ADMOB_TEST_DEVICE_IDS` is passed to `AdMob.initialize` so those devices receive
 * test creatives even when the request uses a live unit.
 */

/** Live AdMob app ids. Debug and release native builds both use these. */
export const PRODUCTION_APP_IDS = {
  android: "ca-app-pub-7582636626157081~3112060012",
  ios: "ca-app-pub-7582636626157081~3902397504",
} as const;

/** Live "Dashboard banner" units. Used only by release builds unless a test flag is on. */
export const PRODUCTION_BANNER_IDS = {
  android: "ca-app-pub-7582636626157081/2423608964",
  ios: "ca-app-pub-7582636626157081/8543836741",
} as const;

export const ADMOB_PUBLISHER_ID = "pub-7582636626157081";

/** Google's official sample app ids. Not written into store manifests. */
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
  forceTestAds: "VITE_ADMOB_FORCE_TEST_ADS",
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
 * Nothing is for sale yet. The hidden developer switches are the only writers.
 * `forceTestAds` requests Google's sample banner units even on a release build.
 */
export interface AdsPreference {
  adsEnabled: boolean;
  forceTestAds: boolean;
}

export const DEFAULT_ADS_PREFERENCE: AdsPreference = {
  adsEnabled: true,
  forceTestAds: false,
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
    androidAppId: envString(env, ADMOB_ENV.androidAppId) ?? PRODUCTION_APP_IDS.android,
    iosAppId: envString(env, ADMOB_ENV.iosAppId) ?? PRODUCTION_APP_IDS.ios,
    androidBannerId: envString(env, ADMOB_ENV.androidBannerId) ?? PRODUCTION_BANNER_IDS.android,
    iosBannerId: envString(env, ADMOB_ENV.iosBannerId) ?? PRODUCTION_BANNER_IDS.ios,
  };
}

export function envFlag(env: EnvMap, key: string): boolean {
  const value = envString(env, key)?.toLowerCase();
  return value === "1" || value === "true" || value === "yes";
}

export function testDeviceIds(env: EnvMap = import.meta.env): string[] {
  const devices = envString(env, ADMOB_ENV.testDeviceIds);
  if (!devices) return [];
  return devices
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

/**
 * Google sample banner units for debug builds, the hidden test-ads switch, and
 * `VITE_ADMOB_FORCE_TEST_ADS`. Release builds otherwise use the live units in `ids`.
 */
export function shouldUseGoogleTestUnits(input: {
  devServer: boolean;
  nativeDebug: boolean;
  forceTestAds: boolean;
  forceTestAdsFromEnv: boolean;
}): boolean {
  return input.devServer || input.nativeDebug || input.forceTestAds || input.forceTestAdsFromEnv;
}

export function adsPlatform(platform: string): AdsPlatform {
  if (platform === "android" || platform === "ios") return platform;
  return "web";
}

export function bannerAdUnitId(
  platform: AdsPlatform,
  options: { useTestUnits?: boolean; ids?: AdMobIds } = {},
): string | null {
  const ids = options.ids ?? resolveAdMobIds();
  if (platform === "android") return options.useTestUnits ? GOOGLE_TEST_BANNER_IDS.android : ids.androidBannerId;
  if (platform === "ios") return options.useTestUnits ? GOOGLE_TEST_BANNER_IDS.ios : ids.iosBannerId;
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
  const record = value as { adsEnabled?: unknown; forceTestAds?: unknown };
  return {
    adsEnabled: typeof record.adsEnabled === "boolean" ? record.adsEnabled : DEFAULT_ADS_PREFERENCE.adsEnabled,
    forceTestAds: record.forceTestAds === true,
  };
}

export interface ConsentDebugOverride {
  geography: "DISABLED" | "EEA" | "US" | "OTHER";
  testDeviceIds: string[];
}

export function consentDebugOverride(env: EnvMap = import.meta.env): ConsentDebugOverride | undefined {
  const geography = envString(env, ADMOB_ENV.debugGeography)?.toUpperCase();
  const devices = testDeviceIds(env);
  const allowed = new Set(["DISABLED", "EEA", "US", "OTHER"]);
  const known = geography && allowed.has(geography) ? (geography as ConsentDebugOverride["geography"]) : undefined;
  if (!known && devices.length === 0) return undefined;
  return { geography: known ?? "DISABLED", testDeviceIds: devices };
}
