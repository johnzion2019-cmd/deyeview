/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * Android AdMob app id (`ca-app-pub-…~…`).
   * Also written into `android/app/src/main/res/values/strings.xml` by `scripts/apply-admob-native-ids.mjs` during `npm run build`.
   * Leave unset to keep Google's official test app id.
   */
  readonly VITE_ADMOB_ANDROID_APP_ID?: string;
  /**
   * iOS AdMob app id (`ca-app-pub-…~…`).
   * Also written into `ios/App/App/Info.plist` (`GADApplicationIdentifier`) during `npm run build`.
   */
  readonly VITE_ADMOB_IOS_APP_ID?: string;
  /** Android banner ad unit (`ca-app-pub-…/…`). Leave unset to keep Google's test banner. */
  readonly VITE_ADMOB_ANDROID_BANNER_ID?: string;
  /** iOS banner ad unit (`ca-app-pub-…/…`). Leave unset to keep Google's test banner. */
  readonly VITE_ADMOB_IOS_BANNER_ID?: string;
  /**
   * Optional UMP debug geography for a test device: `EEA`, `US`, `OTHER`, or `DISABLED`.
   * Has no effect until `VITE_ADMOB_TEST_DEVICE_IDS` is set. Do not enable this in a store build.
   */
  readonly VITE_ADMOB_DEBUG_GEOGRAPHY?: string;
  /** Comma-separated UMP test device ids. Only for debugging the consent form. */
  readonly VITE_ADMOB_TEST_DEVICE_IDS?: string;
}
