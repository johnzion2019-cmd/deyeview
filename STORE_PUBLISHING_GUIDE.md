# DeyeView store publishing guide

DeyeView `1.0.0` (`com.deyeview.app`) is a Capacitor app. The phone talks to Deye Cloud and Open-Meteo directly. There is no DeyeView account server. Support mail is [johnzion2019@gmail.com](mailto:johnzion2019@gmail.com).

Host these files at stable HTTPS URLs and paste those URLs into both consoles:

| Page | File | Suggested path |
| --- | --- | --- |
| Privacy Policy | `public/privacy.html` | `/privacy.html` |
| Terms of Use | `public/terms.html` | `/terms.html` |
| Support | `public/support.html` | `/support.html` |
| app-ads.txt | `public/app-ads.txt` | `https://deyeview.onrender.com/app-ads.txt` |

Google’s data-deletion URL can be the privacy page anchor `/privacy.html#delete`. The same steps are on the support page. `app-ads.txt` must be served at the site root, not under a subpath. The file in this repo is a placeholder until an AdMob publisher id exists.

## Reviewer path (both stores)

The app does not require a Deye inverter.

1. Install the build and open it.
2. Tap **Try Live Demo**.
3. Confirm the energy-flow hero, battery runtime, Day / Month savings, 30-day chart, records strip, payback tracker, today/tomorrow forecast, and **Export CSV report**.
4. Open Settings and the Privacy, Terms, and Support pages. **Privacy & ad choices** explains consent. On a phone build, a Google test banner may sit under the dashboard. It is absent on the welcome screen and in Settings.
5. **Disconnect & Clear Local Data** returns the app to the welcome screen. That is the in-app deletion control.
6. Optional: **Connect My Deye Inverter** shows the real setup form. Reviewers without a Deye developer app should stop at Demo Mode. The pill **Demo Mode · Connect Inverter** stays on screen while the simulation is running.

Put that list in App Review notes and in the Play Console testing instructions.

## Google Play Console

### App identity

- App name: DeyeView
- Package name: `com.deyeview.app`
- Default language: English
- App category: Tools (or House & Home)
- Free, contains ads, no in-app products at launch

Short description:

> Live solar, battery, and savings for your Deye hybrid inverter.

Full description:

> DeyeView is a private companion for Deye hybrid inverter owners. See PV, grid, battery, and home load on one screen, with state of charge, time to reserve or to full, day and month savings in your currency, a 30-day history, best-day records, a payback tracker, and a today/tomorrow generation forecast.
>
> Connect with the Deye Cloud Open API (EMEA/APAC or Americas). Your App ID, App Secret, and password stay on this phone and are sent only to Deye Cloud. There is no DeyeView account.
>
> New here, or reviewing the app? Try Live Demo runs every feature without an inverter. DeyeView is free. The Android and iOS dashboard may show one Google AdMob banner; the welcome screen and Settings do not. It is an independent app and is not affiliated with Ningbo Deye Inverter Technology Co., Ltd.

### Closed testing (14 days)

Personal Play developer accounts created after November 2023 must pass a closed test before production access. Organization accounts are often exempt. If the console asks for the test, do all of the following before you apply for production:

- Create a closed testing release and roll it out.
- Add at least 12 testers who opt in.
- Keep the release installed and available for 14 consecutive days.
- Testers should open Demo Mode, export a CSV, and open Settings at least once so the release is actually used.
- Do not pause the track or drop below 12 opted-in testers during the 14 days.
- After the console shows the requirement as met, apply for production access, then promote the same artifact.

### Data safety

Answer from what the app actually does. Credentials are stored on the device and also sent to Deye Cloud. Coordinates are sent to Open-Meteo. DeyeView itself has no backend.

| Question | Answer |
| --- | --- |
| Does the app collect or share any of the required user data types? | Yes |
| Is all of the collected user data encrypted in transit? | Yes (HTTPS only) |
| Do you provide a way for users to request that their data is deleted? | Yes. In-app **Disconnect & Clear Local Data**. We do not retain a copy. Link `/privacy.html#delete`. |
| Email address | Collected and shared with Deye Cloud. Purpose: App functionality. Not sold. Not used for tracking. |
| Approximate location | User-entered latitude and longitude, shared with Open-Meteo for the forecast. Purpose: App functionality. |
| Device or other IDs | Inverter serial number, shared with Deye Cloud. Purpose: App functionality. Advertising ID (and, if present, the app set ID), collected and shared with Google AdMob. Purpose: Advertising. Not sold by DeyeView. |
| Approximate location | User-entered latitude and longitude, shared with Open-Meteo for the forecast. Purpose: App functionality. AdMob may also derive an approximate location from the IP address. Purpose: Advertising. |
| Photos | Optional house photo. Collected on device only. Not shared. |
| Financial info | Tariff and install cost stay on the device. Do not declare them as collected. |
| Diagnostics | Crash logs and performance data collected by the Google Mobile Ads SDK and shared with Google. Purpose: Advertising. |
| Ads | Yes. The app contains ads. Declare **Contains ads**. |
| Analytics you operate | No first-party analytics SDK. |
| Tracking | AdMob may use the advertising ID for advertising. On iOS this waits for App Tracking Transparency. If the user declines, requests are non-personalized. |

Account creation: users may sign in to their existing Deye Cloud account from the app. DeyeView does not create its own account.

### Signing secrets

Create an upload keystore once and store it outside the repo:

```bash
keytool -genkeypair -v \
  -keystore deyeview-upload.keystore \
  -alias deyeview \
  -keyalg RSA -keysize 2048 -validity 10000
```

GitHub Actions repository secrets:

| Secret | Value |
| --- | --- |
| `ANDROID_KEYSTORE_BASE64` | `base64 -w 0 deyeview-upload.keystore` (macOS: `base64 < deyeview-upload.keystore`) |
| `ANDROID_KEYSTORE_PASSWORD` | Keystore password |
| `ANDROID_KEY_ALIAS` | `deyeview` |
| `ANDROID_KEY_PASSWORD` | Key password |

`.github/workflows/android-build.yml` always builds a debug APK. When `ANDROID_KEYSTORE_BASE64` is set it also builds a signed release AAB. Play App Signing should stay enabled; upload the AAB and let Google hold the app signing key. Enroll in Play App Signing on the first production upload and keep the upload keystore backup offline.

Local equivalent:

```bash
export ANDROID_KEYSTORE_PATH="$PWD/deyeview-upload.keystore"
export ANDROID_KEYSTORE_PASSWORD="…"
export ANDROID_KEY_ALIAS="deyeview"
export ANDROID_KEY_PASSWORD="…"
cd android && ./gradlew bundleRelease
```

The release signing block in `android/app/build.gradle` is skipped when `ANDROID_KEYSTORE_PATH` is unset, so debug builds and CI without secrets still assemble.

### Listing assets

- App icon: `public/icon-512.png` (the Android project uses the generated adaptive icons).
- Feature graphic: 1024×500, deep green `#12352c` with the sun-and-roof mark.
- Phone screenshots: at least two. Capture welcome and Demo Mode on a phone. The in-app house hero is the screenshot.
- Content rating: questionnaire, no violence, no user-generated public content. Answer **yes** to ads. The banner is a standard AdMob unit, not an age-restricted creative.
- Target audience: 18 and older. Not a children’s app.
- News app declaration: No. Government app: No. COVID-19 contact status: No.

## App Store Connect

### Identity

- Name: DeyeView
- Bundle ID: `com.deyeview.app`
- SKU: `deyeview-ios`
- Primary category: Utilities
- Price: Free
- Age rating: 4+

Subtitle:

> Solar, battery, and savings

Promotional text:

> Try Live Demo if you want the whole dashboard before you connect a Deye inverter.

Description: use the Play full description above. Keywords (100 characters, no “Deye” stuffing beyond what is accurate):

> solar,inverter,battery,hybrid,energy,savings,forecast,pv,soc

### App Privacy

Email, the inverter serial, and the coordinates the user types are used for app functionality and are not used to track the user. The dashboard banner adds third-party advertising. Tracking is limited to the advertising identifier when the user allows App Tracking Transparency. Declining that prompt, or declining personalized ads in Google’s consent form, makes the ad request non-personalized.

| Data type | Linked to the user | Tracking | Purpose |
| --- | --- | --- | --- |
| Contact Info → Email Address | Yes (it is the Deye account email) | No | App Functionality |
| Location → Coarse Location | Yes | No | App Functionality (the coordinates the user enters, sent to Open-Meteo). Also declare coarse location for Third-Party Advertising because AdMob may infer an approximate location. |
| Identifiers → Device ID | No | Yes, if ATT is allowed | Third-Party Advertising |
| Identifiers → Other (inverter serial) | Yes | No | App Functionality |
| Diagnostics → Crash Data | No | No | Third-Party Advertising |
| Diagnostics → Performance Data | No | No | Third-Party Advertising |

Do not declare photos or payment info. The house photo and tariff never leave the device. Do not pick “Data Not Collected”: email, serial, and coordinates are transmitted, and AdMob receives advertising identifiers.

`NSUserTrackingUsageDescription` is set. The prompt is requested on the dashboard before a banner load, after the Google UMP form when that form is required. `PrivacyInfo.xcprivacy` marks tracking on and lists the Google ad domains.

Privacy Policy URL: your hosted `/privacy.html`. Support URL: your hosted `/support.html`.

Encryption: the app only uses HTTPS. In Info.plist, `ITSAppUsesNonExemptEncryption` is false, so you can answer “No” to the export-compliance question on each build.

Photo library: the connect flow can set a house photo. `NSPhotoLibraryUsageDescription` and `NSCameraUsageDescription` explain that. The photo is optional.

### Reviewer notes

Paste:

> No inverter is required. On the welcome screen tap Try Live Demo. Every feature works, including CSV share and Settings → Disconnect & Clear Local Data. A Google test banner may appear at the bottom of the dashboard only. It is not on the welcome screen or in Settings. Settings → Privacy & ad choices reopens Google’s consent form when one is available. Demo Mode · Connect Inverter opens the real Deye Cloud form for owners; reviewers can ignore it. DeyeView does not have a username we can issue. The app is an independent client of the customer’s own Deye Cloud account and is not affiliated with Deye. Ads in this build use Google’s official test ids until an AdMob account is created.

Sign in with a development Apple ID, enable automatic signing for the App target, archive in Xcode (Any iOS Device), and upload with the Organizer or `xcodebuild -exportArchive`. The GitHub workflow `.github/workflows/ios-build.yml` produces an unsigned Release build on a macOS runner so the project compiles before you attach a team.

### What to verify on a device

- Welcome offers Connect and Try Live Demo.
- Demo numbers move, the refresh countdown reaches zero and reloads, and pull-to-refresh works. The banner, when it loads, sits under the scrolling dashboard and does not cover the energy-flow hero or the pull-to-refresh control. Turning the phone offline, or a no-fill response, removes the gap.
- Auto / Day / Night changes the house. A photo replaces the built-in art.
- CSV opens the system share sheet.
- Disconnect returns to the welcome screen and a fresh launch does not restore the old login.

## AdMob

The phone builds ship with Google’s official **test** ids so a banner can be tried before an AdMob account exists. Test ads are labeled “Test Ad” and do not earn. Web preview, the welcome screen, and Settings never request an ad.

| Slot | Where it lives today | Google test value |
| --- | --- | --- |
| Android app id | `android/app/src/main/res/values/strings.xml` (`admob_app_id`), referenced from `AndroidManifest.xml` | `ca-app-pub-3940256099942544~3347511713` |
| iOS app id | `ios/App/App/Info.plist` `GADApplicationIdentifier` | `ca-app-pub-3940256099942544~1458002511` |
| Android banner | `src/config/ads.ts` | `ca-app-pub-3940256099942544/6300978111` |
| iOS banner | `src/config/ads.ts` | `ca-app-pub-3940256099942544/2934735716` |

`Info.plist` also has `NSUserTrackingUsageDescription`, `GADDelayAppMeasurementInit`, and the SKAdNetwork list Google published on 30 January 2026. Play Console must say **Contains ads**. The merged manifest includes `com.google.android.gms.permission.AD_ID`.

### Create the account and swap in real ids

1. Sign in at [admob.google.com](https://admob.google.com) and create an account. Add two apps with package / bundle id `com.deyeview.app`, one Android and one iOS. Copy each **app id** (`ca-app-pub-…~…`).
2. Create one **banner** ad unit per app. Copy each **ad unit id** (`ca-app-pub-…/…`).
3. In AdMob, open Privacy & messaging and publish a GDPR message, and an IDFA message for iOS. Until those exist, the consent form has nothing to show. The app still calls UMP before loading an ad.
4. Paste the ids into `src/config/ads.ts`, or leave that file on the test constants and set `VITE_ADMOB_ANDROID_APP_ID`, `VITE_ADMOB_IOS_APP_ID`, `VITE_ADMOB_ANDROID_BANNER_ID`, and `VITE_ADMOB_IOS_BANNER_ID` (see `.env.example`). Do not commit the filled `.env`.
5. Run `npm run build` then `npx cap sync`. The build script copies the two app ids into `strings.xml` and `Info.plist`. Banner ids are compiled into the web bundle from `src/config/ads.ts`. The native app id and the id in config must match.
6. In AdMob, copy the app-ads.txt line (`google.com, pub-XXXXXXXXXXXXXXXX, DIRECT, f08c47fec0942fa0`). Replace `public/app-ads.txt` with that single line and deploy the site so it is available at [https://deyeview.onrender.com/app-ads.txt](https://deyeview.onrender.com/app-ads.txt). Enter that URL in AdMob and wait until the file verifies.
7. Ship a build that no longer uses the sample ids. Sample ids are fine for closed testing. They must not be the production ad units after the account is approved.

Play: set **Contains ads** to yes, complete the Data Safety rows in the table above, and answer the advertising ID question as yes (the app uses the advertising ID, and users can opt out of personalized ads). App Store: complete App Privacy as in the table above, and do not claim that you do not track if ATT is requested.

### Ads on or off

`adsEnabled` defaults to true and is stored on the device (`deyeview.ads.v1`). Settings shows **Remove ads (Pro — coming soon)** and does not start a purchase. Tap the version line at the bottom of Settings seven times to reveal **Developer: ads are on / off**. That switch is the only way to write `adsEnabled` today. A later in-app purchase should set the same flag to false and leave the rest of the dashboard alone.

## Build locally

```bash
npm install
npm run typecheck
npm test
npm run build
npx cap sync
```

Android Studio: open `android/`. Xcode: open `ios/App/App.xcworkspace` after `cap sync` has installed CocoaPods on a Mac.
