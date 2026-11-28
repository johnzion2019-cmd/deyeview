/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * Android AdMob app id (`ca-app-pub-…~…`).
   * Also written into `android/app/src/main/res/values/strings.xml` by `scripts/apply-admob-native-ids.mjs` during `npm run build`.
   * Leave unset to keep the live Android app id in src/config/ads.ts.
   */
  readonly VITE_ADMOB_ANDROID_APP_ID?: string;
  /**
   * iOS AdMob app id (`ca-app-pub-…~…`).
   * Also written into `ios/App/App/Info.plist` (`GADApplicationIdentifier`) during `npm run build`.
   */
  readonly VITE_ADMOB_IOS_APP_ID?: string;
  /** Android banner ad unit (`ca-app-pub-…/…`). Leave unset to keep the live Dashboard banner. */
  readonly VITE_ADMOB_ANDROID_BANNER_ID?: string;
  /** iOS banner ad unit (`ca-app-pub-…/…`). Leave unset to keep the live Dashboard banner. */
  readonly VITE_ADMOB_IOS_BANNER_ID?: string;
  /**
   * When `true`, every banner request uses Google's sample units, including a release build.
   * Debug builds already do this without the flag.
   */
  readonly VITE_ADMOB_FORCE_TEST_ADS?: string;
  /**
   * Optional UMP debug geography for a test device: `EEA`, `US`, `OTHER`, or `DISABLED`.
   * Has no effect until `VITE_ADMOB_TEST_DEVICE_IDS` is set. Do not enable this in a store build.
   */
  readonly VITE_ADMOB_DEBUG_GEOGRAPHY?: string;
  /**
   * Comma-separated AdMob test device ids. Passed to AdMob.initialize so those devices
   * receive test creatives. Also sent to the UMP debug request. Do not set this in a store build
   * unless you intend to mark those devices as test devices.
   */
  readonly VITE_ADMOB_TEST_DEVICE_IDS?: string;
}
