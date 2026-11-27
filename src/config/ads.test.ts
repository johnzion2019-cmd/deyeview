import { describe, expect, it } from "vitest";
import {
  GOOGLE_TEST_APP_IDS,
  GOOGLE_TEST_BANNER_IDS,
  adsPlatform,
  bannerAdUnitId,
  bannerReservePx,
  consentDebugOverride,
  normalizeAdsPreference,
  resolveAdMobIds,
  serveNonPersonalizedAds,
  shouldShowDashboardBanner,
  usesOfficialGoogleTestIds,
} from "@/config/ads";

describe("AdMob test ids", () => {
  it("uses Google's official sample app and banner ids", () => {
    const ids = resolveAdMobIds({});
    expect(ids).toEqual({
      androidAppId: "ca-app-pub-3940256099942544~3347511713",
      iosAppId: "ca-app-pub-3940256099942544~1458002511",
      androidBannerId: "ca-app-pub-3940256099942544/6300978111",
      iosBannerId: "ca-app-pub-3940256099942544/2934735716",
    });
    expect(ids.androidAppId).toBe(GOOGLE_TEST_APP_IDS.android);
    expect(ids.iosBannerId).toBe(GOOGLE_TEST_BANNER_IDS.ios);
    expect(usesOfficialGoogleTestIds(ids)).toBe(true);
  });

  it("lets a build-time env value replace one id and keeps the other test ids", () => {
    const ids = resolveAdMobIds({
      VITE_ADMOB_ANDROID_BANNER_ID: " ca-app-pub-100/200 ",
      VITE_ADMOB_IOS_APP_ID: "",
    });
    expect(ids.androidBannerId).toBe("ca-app-pub-100/200");
    expect(ids.androidAppId).toBe(GOOGLE_TEST_APP_IDS.android);
    expect(ids.iosAppId).toBe(GOOGLE_TEST_APP_IDS.ios);
    expect(usesOfficialGoogleTestIds(ids)).toBe(false);
  });

  it("picks a platform banner unit and none for web", () => {
    const ids = resolveAdMobIds({});
    expect(bannerAdUnitId("android", ids)).toBe(GOOGLE_TEST_BANNER_IDS.android);
    expect(bannerAdUnitId("ios", ids)).toBe(GOOGLE_TEST_BANNER_IDS.ios);
    expect(bannerAdUnitId("web", ids)).toBeNull();
    expect(adsPlatform("electron")).toBe("web");
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
    expect(normalizeAdsPreference(null)).toEqual({ adsEnabled: true });
    expect(normalizeAdsPreference({})).toEqual({ adsEnabled: true });
    expect(normalizeAdsPreference({ adsEnabled: false })).toEqual({ adsEnabled: false });
    expect(normalizeAdsPreference({ adsEnabled: "no" })).toEqual({ adsEnabled: true });
  });

  it("reads an optional consent debug override", () => {
    expect(consentDebugOverride({})).toBeUndefined();
    expect(consentDebugOverride({ VITE_ADMOB_DEBUG_GEOGRAPHY: "eea", VITE_ADMOB_TEST_DEVICE_IDS: " abc , def " })).toEqual({
      geography: "EEA",
      testDeviceIds: ["abc", "def"],
    });
  });
});
