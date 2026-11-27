/**
 * Copies VITE_ADMOB_ANDROID_APP_ID / VITE_ADMOB_IOS_APP_ID into the native projects
 * when those variables are set. Banner units are read from src/config/ads.ts at build time
 * and are not stored in the manifests.
 *
 * Unset variables leave Google's official test app ids in place.
 * `npm run build` runs this before Vite so a store build and the JS bundle stay aligned.
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

const env = loadBuildEnv();
const android = env.VITE_ADMOB_ANDROID_APP_ID?.trim();
const ios = env.VITE_ADMOB_IOS_APP_ID?.trim();

if (android) {
  const id = requireAppId("VITE_ADMOB_ANDROID_APP_ID", android);
  replaceOnce(
    path.join(root, "android/app/src/main/res/values/strings.xml"),
    /(<string name="admob_app_id">)[^<]*(<\/string>)/,
    `$1${id}$2`,
    "admob_app_id",
  );
  console.log("AdMob Android app id updated from VITE_ADMOB_ANDROID_APP_ID");
}

if (ios) {
  const id = requireAppId("VITE_ADMOB_IOS_APP_ID", ios);
  replaceOnce(
    path.join(root, "ios/App/App/Info.plist"),
    /(<key>GADApplicationIdentifier<\/key>\s*<string>)[^<]*(<\/string>)/,
    `$1${id}$2`,
    "GADApplicationIdentifier",
  );
  console.log("AdMob iOS app id updated from VITE_ADMOB_IOS_APP_ID");
}
