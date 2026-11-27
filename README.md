# DeyeView

DeyeView is a phone companion for people who own a Deye hybrid inverter. It is a React and TypeScript app, packaged with Capacitor for Android and iOS (`com.deyeview.app`).

The phone calls the Deye Cloud Open API itself (`eu1-developer.deyecloud.com` or `us1-developer.deyecloud.com`). Passwords are SHA-256 hashed on the device before `POST /v1.0/account/token`. Live power comes from `/v1.0/device/latest`. Daily and monthly energy come from `/v1.0/station/history`. Nothing is stored on a DeyeView server. A Vite dev proxy exists only so the browser preview can reach those hosts without CORS.

Try Live Demo runs a ticking plant with 90 days of history, battery runtime, savings, records, payback, an Open-Meteo forecast, and CSV export. Store reviewers do not need an inverter.

## Run the preview

```bash
npm install
npm run dev
```

Open http://127.0.0.1:43117 . Choose **Try Live Demo** or connect an inverter.

```bash
npm run typecheck
npm test
npm run build
npx cap sync
```

`npm run build` writes `dist/`. Capacitor copies that folder into `android/` and `ios/`.

## Native plugins

Preferences, Status Bar, Splash Screen, Haptics, Filesystem, and Share are used for the saved plant, the status bar, launch, taps, and the CSV share sheet. `CapacitorHttp` is enabled so release builds are not blocked by browser CORS. On the web, `/deye-eu`, `/deye-us`, and `/meteo` proxy to Deye and Open-Meteo.

## Store pages

`public/privacy.html`, `public/terms.html`, and `public/support.html` are the pages to host for Play Console and App Store Connect. Publishing steps, the 14-day closed test, Data Safety, App Privacy, and keystore secrets are in `STORE_PUBLISHING_GUIDE.md`.

DeyeView is an independent app. It is not affiliated with Ningbo Deye Inverter Technology Co., Ltd.
