import type { PluginListenerHandle } from "@capacitor/core";
import { Capacitor } from "@capacitor/core";
import {
  AdMob,
  AdmobConsentDebugGeography,
  AdmobConsentStatus,
  BannerAdPluginEvents,
  BannerAdPosition,
  BannerAdSize,
  type AdmobConsentInfo,
} from "@capacitor-community/admob";
import { Preferences } from "@capacitor/preferences";
import {
  FALLBACK_BANNER_HEIGHT_PX,
  adsPlatform,
  bannerAdUnitId,
  bannerReservePx,
  consentDebugOverride,
  normalizeAdsPreference,
  resolveAdMobIds,
  serveNonPersonalizedAds,
  shouldShowDashboardBanner,
  usesOfficialGoogleTestIds,
  type AdsPreference,
  type ConsentChoice,
  type TrackingChoice,
} from "@/config/ads";

const ADS_PREFERENCE_KEY = "deyeview.ads.v1";
const BANNER_LOAD_TIMEOUT_MS = 12_000;

const GEOGRAPHY = {
  DISABLED: AdmobConsentDebugGeography.DISABLED,
  EEA: AdmobConsentDebugGeography.EEA,
  US: AdmobConsentDebugGeography.US,
  OTHER: AdmobConsentDebugGeography.OTHER,
} as const;

export interface PreparedAds {
  canRequestAds: boolean;
  npa: boolean;
}

export interface AdPrivacyResult {
  shown: boolean;
  message?: string;
}

let prepared: Promise<PreparedAds> | null = null;
let activeBannerId = 0;

export async function loadAdsPreference(): Promise<AdsPreference> {
  try {
    const { value } = await Preferences.get({ key: ADS_PREFERENCE_KEY });
    if (!value) return normalizeAdsPreference(null);
    return normalizeAdsPreference(JSON.parse(value));
  } catch {
    return normalizeAdsPreference(null);
  }
}

export async function saveAdsPreference(preference: AdsPreference): Promise<void> {
  const next = normalizeAdsPreference(preference);
  await Preferences.set({ key: ADS_PREFERENCE_KEY, value: JSON.stringify(next) });
}

/** Drop the cached consent result so the next dashboard visit reads the latest choice. */
export function resetAdvertisingSession(): void {
  prepared = null;
}

export function prepareAdvertising(): Promise<PreparedAds> {
  if (!Capacitor.isNativePlatform()) return Promise.resolve({ canRequestAds: false, npa: true });
  prepared ??= runPrepare().catch(() => {
    prepared = null;
    return { canRequestAds: false, npa: true };
  });
  return prepared;
}

/**
 * UMP, then App Tracking Transparency on iOS, then the Mobile Ads SDK.
 * A failure never throws. Test ids still try a non-personalized banner when UMP
 * has no message yet (there is no AdMob account). Real ids stay off if consent cannot be read.
 */
async function runPrepare(): Promise<PreparedAds> {
  const platform = adsPlatform(Capacitor.getPlatform());
  const ids = resolveAdMobIds();
  let consent: ConsentChoice = "UNKNOWN";
  let allowAds = false;

  try {
    const info = await presentConsentFormIfNeeded(await AdMob.requestConsentInfo(consentRequestOptions()));
    consent = consentChoice(info.status);
    allowAds = info.canRequestAds === true;
  } catch {
    allowAds = usesOfficialGoogleTestIds(ids);
    consent = "UNKNOWN";
  }

  if (!allowAds) return { canRequestAds: false, npa: true };

  let tracking: TrackingChoice = "authorized";
  if (platform === "ios") {
    try {
      tracking = await resolveIosTracking();
    } catch {
      tracking = "unavailable";
    }
  }

  try {
    await AdMob.initialize();
  } catch {
    return { canRequestAds: false, npa: true };
  }

  return {
    canRequestAds: true,
    npa: serveNonPersonalizedAds({ platform, tracking, consent }),
  };
}

function consentRequestOptions() {
  const debug = consentDebugOverride();
  if (!debug) return undefined;
  return {
    debugGeography: GEOGRAPHY[debug.geography],
    testDeviceIdentifiers: debug.testDeviceIds,
  };
}

async function presentConsentFormIfNeeded(info: AdmobConsentInfo): Promise<AdmobConsentInfo> {
  const needsForm = info.status === AdmobConsentStatus.REQUIRED || info.isConsentFormAvailable === true;
  if (!needsForm) return info;
  try {
    const shown = await AdMob.showConsentForm();
    return {
      status: shown.status ?? info.status,
      canRequestAds: shown.canRequestAds,
      isConsentFormAvailable: shown.isConsentFormAvailable ?? info.isConsentFormAvailable,
      privacyOptionsRequirementStatus: shown.privacyOptionsRequirementStatus ?? info.privacyOptionsRequirementStatus,
    };
  } catch {
    return info;
  }
}

function consentChoice(status: AdmobConsentStatus | undefined): ConsentChoice {
  if (status === AdmobConsentStatus.OBTAINED) return "OBTAINED";
  if (status === AdmobConsentStatus.NOT_REQUIRED) return "NOT_REQUIRED";
  if (status === AdmobConsentStatus.REQUIRED) return "REQUIRED";
  return "UNKNOWN";
}

async function resolveIosTracking(): Promise<TrackingChoice> {
  let status = (await AdMob.trackingAuthorizationStatus()).status;
  if (status === "notDetermined") {
    await AdMob.requestTrackingAuthorization();
    status = (await AdMob.trackingAuthorizationStatus()).status;
  }
  if (status === "authorized" || status === "denied" || status === "restricted" || status === "notDetermined") return status;
  return "unavailable";
}

export async function openAdPrivacyChoices(): Promise<AdPrivacyResult> {
  if (!Capacitor.isNativePlatform()) {
    return {
      shown: false,
      message: "Ad choices are available in the Android and iOS apps. This browser preview does not load ads.",
    };
  }
  try {
    const info = await AdMob.requestConsentInfo(consentRequestOptions());
    if (String(info.privacyOptionsRequirementStatus) === "REQUIRED") {
      await AdMob.showPrivacyOptionsForm();
      resetAdvertisingSession();
      return { shown: true };
    }
    if (info.isConsentFormAvailable || info.status === AdmobConsentStatus.REQUIRED) {
      try {
        await AdMob.showConsentForm();
        resetAdvertisingSession();
        if (info.status === AdmobConsentStatus.REQUIRED) return { shown: true };
        return {
          shown: false,
          message: "Your ad choice is already saved on this device. Google did not ask for a new form.",
        };
      } catch {
        return {
          shown: false,
          message: "Google has no privacy form for this region yet. Ads stay off when consent is required and missing.",
        };
      }
    }
    return {
      shown: false,
      message: "Google has no privacy form for this region yet. Ads stay off when consent is required and missing.",
    };
  } catch {
    return {
      shown: false,
      message: "The ad privacy form could not be opened. Check your connection and try again.",
    };
  }
}

export interface BannerHandle {
  stop: () => Promise<void>;
}

/**
 * One adaptive banner for the native dashboard. Call `stop` when leaving that screen.
 * Offline, no-fill, and SDK errors clear the reservation so the layout does not keep a gap.
 */
export function startDashboardBanner(onHeight: (heightPx: number) => void): BannerHandle {
  const id = ++activeBannerId;
  let stopped = false;
  const handles: PluginListenerHandle[] = [];
  let timer = 0;
  const isActive = () => !stopped && activeBannerId === id;
  const publish = (heightPx: number) => {
    if (isActive()) onHeight(bannerReservePx(heightPx));
  };

  const pending = (async () => {
    if (!Capacitor.isNativePlatform()) {
      publish(0);
      return;
    }
    try {
      await safeRemoveBanner();
      if (!isActive()) return;
      const platform = adsPlatform(Capacitor.getPlatform());
      const preference = await loadAdsPreference();
      if (!isActive() || !shouldShowDashboardBanner({ platform, adsEnabled: preference.adsEnabled })) {
        publish(0);
        return;
      }
      const ready = await prepareAdvertising();
      if (!isActive() || !ready.canRequestAds) {
        publish(0);
        return;
      }
      const adId = bannerAdUnitId(platform);
      if (!adId) {
        publish(0);
        return;
      }

      let seenHeight = 0;
      const fail = () => {
        window.clearTimeout(timer);
        seenHeight = 0;
        publish(0);
        void safeRemoveBanner();
      };

      handles.push(
        await AdMob.addListener(BannerAdPluginEvents.SizeChanged, (size) => {
          if (!isActive()) return;
          seenHeight = size?.height ?? 0;
          if (seenHeight > 0) {
            window.clearTimeout(timer);
            publish(seenHeight);
          }
        }),
      );
      handles.push(
        await AdMob.addListener(BannerAdPluginEvents.Loaded, () => {
          if (!isActive()) return;
          window.clearTimeout(timer);
          if (seenHeight <= 0) publish(FALLBACK_BANNER_HEIGHT_PX);
        }),
      );
      handles.push(
        await AdMob.addListener(BannerAdPluginEvents.FailedToLoad, () => {
          if (!isActive()) return;
          fail();
        }),
      );
      if (!isActive()) return;

      timer = window.setTimeout(() => {
        if (isActive()) fail();
      }, BANNER_LOAD_TIMEOUT_MS);

      await AdMob.showBanner({
        adId,
        adSize: BannerAdSize.ADAPTIVE_BANNER,
        position: BannerAdPosition.BOTTOM_CENTER,
        margin: 0,
        // The plugin's iOS testing flag swaps in the Android sample banner unit. Pass the platform unit instead.
        isTesting: false,
        npa: ready.npa,
      });
    } catch {
      publish(0);
      await safeRemoveBanner();
    }
  })();

  return {
    async stop() {
      stopped = true;
      window.clearTimeout(timer);
      await pending.catch(() => undefined);
      await detach(handles);
      if (activeBannerId === id) await safeRemoveBanner();
    },
  };
}

async function detach(handles: PluginListenerHandle[]): Promise<void> {
  await Promise.all(handles.splice(0).map((handle) => handle.remove().catch(() => undefined)));
}

async function safeRemoveBanner(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await AdMob.removeBanner();
  } catch {
    /* Already gone, or the SDK never created one. */
  }
}
