import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  ADMOB_PUBLISHER_ID,
  GOOGLE_TEST_BANNER_IDS,
  PRODUCTION_APP_IDS,
  PRODUCTION_BANNER_IDS,
  adsPlatform,
  bannerAdUnitId,
  bannerReservePx,
  consentDebugOverride,
  normalizeAdsPreference,
  resolveAdMobIds,
  serveNonPersonalizedAds,
  shouldShowDashboardBanner,
  shouldUseGoogleTestUnits,
  testDeviceIds,
} from "@/config/ads";

describe("AdMob release ids", () => {
  it("uses the live DeyeView app and dashboard banner ids", () => {
    expect(resolveAdMobIds({})).toEqual({
      androidAppId: "ca-app-pub-7582636626157081~3112060012",
      iosAppId: "ca-app-pub-7582636626157081~3902397504",
      androidBannerId: "ca-app-pub-7582636626157081/2423608964",
      iosBannerId: "ca-app-pub-7582636626157081/8543836741",
    });
    expect(PRODUCTION_APP_IDS.android).toBe("ca-app-pub-7582636626157081~3112060012");
    expect(PRODUCTION_BANNER_IDS.ios).toBe("ca-app-pub-7582636626157081/8543836741");
  });

  it("lets a build-time env value replace one id and keeps the other live ids", () => {
    const ids = resolveAdMobIds({
      VITE_ADMOB_ANDROID_BANNER_ID: " ca-app-pub-100/200 ",
      VITE_ADMOB_IOS_APP_ID: "",
    });
    expect(ids.androidBannerId).toBe("ca-app-pub-100/200");
    expect(ids.androidAppId).toBe(PRODUCTION_APP_IDS.android);
    expect(ids.iosAppId).toBe(PRODUCTION_APP_IDS.ios);
  });

  it("requests Google sample banner units only when a test flag is on", () => {
    const ids = resolveAdMobIds({});
    expect(bannerAdUnitId("android", { ids })).toBe(PRODUCTION_BANNER_IDS.android);
    expect(bannerAdUnitId("ios", { ids, useTestUnits: true })).toBe(GOOGLE_TEST_BANNER_IDS.ios);
    expect(bannerAdUnitId("android", { ids, useTestUnits: true })).toBe(GOOGLE_TEST_BANNER_IDS.android);
    expect(bannerAdUnitId("web", { ids, useTestUnits: true })).toBeNull();
    expect(adsPlatform("electron")).toBe("web");
    expect(shouldUseGoogleTestUnits({ devServer: false, nativeDebug: false, forceTestAds: false, forceTestAdsFromEnv: false })).toBe(false);
    expect(shouldUseGoogleTestUnits({ devServer: false, nativeDebug: true, forceTestAds: false, forceTestAdsFromEnv: false })).toBe(true);
    expect(shouldUseGoogleTestUnits({ devServer: true, nativeDebug: false, forceTestAds: false, forceTestAdsFromEnv: false })).toBe(true);
    expect(shouldUseGoogleTestUnits({ devServer: false, nativeDebug: false, forceTestAds: true, forceTestAdsFromEnv: false })).toBe(true);
    expect(shouldUseGoogleTestUnits({ devServer: false, nativeDebug: false, forceTestAds: false, forceTestAdsFromEnv: true })).toBe(true);
  });

  it("publishes the AdMob app-ads.txt line for the developer site root", () => {
    const file = readFileSync(new URL("../../public/app-ads.txt", import.meta.url), "utf8");
    expect(file).toBe(`google.com, ${ADMOB_PUBLISHER_ID}, DIRECT, f08c47fec0942fa0\n`);
  });
});

describe("dashboard banner policy", () => {
  it("shows only on native when ads are enabled", () => {
    expect(shouldShowDashboardBanner({ platform: "android", adsEnabled: true })).toBe(true);
    expect(shouldShowDashboardBanner({ platform: "ios", adsEnabled: true })).toBe(true);
    expect(shouldShowDashboardBanner({ platform: "web", adsEnabled: true })).toBe(false);
    expect(shouldShowDashboardBanner({ platform: "android", adsEnabled: false })).toBe(false);
  });

  it("serves non-personalized ads when tracking or consent is declined", () => {
    expect(serveNonPersonalizedAds({ platform: "ios", tracking: "denied", consent: "OBTAINED" })).toBe(true);
    expect(serveNonPersonalizedAds({ platform: "ios", tracking: "restricted", consent: "NOT_REQUIRED" })).toBe(true);
    expect(serveNonPersonalizedAds({ platform: "ios", tracking: "authorized", consent: "NOT_REQUIRED" })).toBe(false);
    expect(serveNonPersonalizedAds({ platform: "android", tracking: "authorized", consent: "UNKNOWN" })).toBe(true);
    expect(serveNonPersonalizedAds({ platform: "android", tracking: "authorized", consent: "OBTAINED" })).toBe(false);
    expect(serveNonPersonalizedAds({ platform: "web", tracking: "authorized", consent: "NOT_REQUIRED" })).toBe(false);
  });

  it("reserves no space until a banner has a real height", () => {
    expect(bannerReservePx(0)).toBe(0);
    expect(bannerReservePx(-8)).toBe(0);
    expect(bannerReservePx(Number.NaN)).toBe(0);
    expect(bannerReservePx(50.4)).toBe(50);
  });
});

describe("ads preference", () => {
  it("defaults to ads on and keeps an explicit off switch", () => {
    expect(normalizeAdsPreference(null)).toEqual({ adsEnabled: true, forceTestAds: false });
    expect(normalizeAdsPreference({})).toEqual({ adsEnabled: true, forceTestAds: false });
    expect(normalizeAdsPreference({ adsEnabled: false })).toEqual({ adsEnabled: false, forceTestAds: false });
    expect(normalizeAdsPreference({ adsEnabled: "no", forceTestAds: true })).toEqual({ adsEnabled: true, forceTestAds: true });
  });

  it("reads test device ids and an optional consent debug override", () => {
    expect(testDeviceIds({})).toEqual([]);
    expect(testDeviceIds({ VITE_ADMOB_TEST_DEVICE_IDS: " abc , def " })).toEqual(["abc", "def"]);
    expect(consentDebugOverride({})).toBeUndefined();
    expect(consentDebugOverride({ VITE_ADMOB_DEBUG_GEOGRAPHY: "eea", VITE_ADMOB_TEST_DEVICE_IDS: " abc , def " })).toEqual({
      geography: "EEA",
      testDeviceIds: ["abc", "def"],
    });
  });
});
