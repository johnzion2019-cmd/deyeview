/**
 * Writes the AdMob app ids into the native projects.
 * Defaults come from PRODUCTION_APP_IDS in src/config/ads.ts.
 * VITE_ADMOB_ANDROID_APP_ID and VITE_ADMOB_IOS_APP_ID replace those defaults.
 * Banner units stay in the web bundle; debug versus release is chosen at runtime.
 *
 * `npm run build` runs this before Vite so the manifest and the JS bundle stay aligned.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const APP_ID = /^ca-app-pub-\d+~\d+$/;

const KEYS = ["VITE_ADMOB_ANDROID_APP_ID", "VITE_ADMOB_IOS_APP_ID"];

function readEnvFile(file) {
  const found = {};
  if (!existsSync(file)) return found;
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    if (!KEYS.includes(key)) continue;
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    found[key] = value;
  }
  return found;
}

function loadBuildEnv() {
  const merged = {};
  for (const name of [".env", ".env.local", ".env.production", ".env.production.local"]) {
    Object.assign(merged, readEnvFile(path.join(root, name)));
  }
  return {
    VITE_ADMOB_ANDROID_APP_ID: process.env.VITE_ADMOB_ANDROID_APP_ID ?? merged.VITE_ADMOB_ANDROID_APP_ID,
    VITE_ADMOB_IOS_APP_ID: process.env.VITE_ADMOB_IOS_APP_ID ?? merged.VITE_ADMOB_IOS_APP_ID,
  };
}

function requireAppId(name, value) {
  const id = value.trim();
  if (!APP_ID.test(id)) {
    throw new Error(`${name} must look like ca-app-pub-0000000000000000~0000000000 (got ${JSON.stringify(value)})`);
  }
  return id;
}

function replaceOnce(file, pattern, replacement, label) {
  const before = readFileSync(file, "utf8");
  if (!pattern.test(before)) throw new Error(`Could not find ${label} in ${path.relative(root, file)}`);
  const after = before.replace(pattern, replacement);
  if (after !== before) writeFileSync(file, after);
}

function productionAppIds() {
  const source = readFileSync(path.join(root, "src/config/ads.ts"), "utf8");
  const block = source.match(/export const PRODUCTION_APP_IDS = \{([\s\S]*?)\} as const/);
  if (!block) throw new Error("PRODUCTION_APP_IDS is missing from src/config/ads.ts");
  function field(name) {
    const match = block[1].match(new RegExp(`${name}:\\s*"([^"]+)"`));
    if (!match) throw new Error(`PRODUCTION_APP_IDS.${name} is missing from src/config/ads.ts`);
    return match[1];
  }
  return { android: field("android"), ios: field("ios") };
}

const defaults = productionAppIds();
const env = loadBuildEnv();
const android = requireAppId("Android app id", env.VITE_ADMOB_ANDROID_APP_ID?.trim() || defaults.android);
const ios = requireAppId("iOS app id", env.VITE_ADMOB_IOS_APP_ID?.trim() || defaults.ios);

replaceOnce(
  path.join(root, "android/app/src/main/res/values/strings.xml"),
  /(<string name="admob_app_id">)[^<]*(<\/string>)/,
  `$1${android}$2`,
  "admob_app_id",
);
replaceOnce(
  path.join(root, "ios/App/App/Info.plist"),
  /(<key>GADApplicationIdentifier<\/key>\s*<string>)[^<]*(<\/string>)/,
  `$1${ios}$2`,
  "GADApplicationIdentifier",
);
console.log("AdMob app ids written to Android strings.xml and iOS Info.plist");
