import { access, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = path.resolve(import.meta.dirname, "..");

const mark = `
  <circle cx="42" cy="18" r="7" fill="#f0b429"/>
  <path d="M12 36 L32 18 L52 36" fill="none" stroke="#d6f25c" stroke-width="3.2" stroke-linejoin="round"/>
  <path d="M18 36 V50 H46 V36" fill="none" stroke="#e8f2ec" stroke-width="3.2"/>
  <path d="M24 30 L32 22.5 L40 30" fill="#1f4d3d" stroke="#d6f25c" stroke-width="1.2"/>`;

function iconSvg(size, { rounded = true, pad = 0 } = {}) {
  const radius = rounded ? Math.round(size * 0.22) : 0;
  const inner = size - pad * 2;
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <rect width="${size}" height="${size}" rx="${radius}" fill="#12352c"/>
    <g transform="translate(${pad} ${pad}) scale(${inner / 64})">${mark}</g>
  </svg>`);
}

async function png(svg, size, dest) {
  await mkdir(path.dirname(dest), { recursive: true });
  await sharp(svg).resize(size, size).png().toFile(dest);
  console.log(path.relative(root, dest));
}

const publicDir = path.join(root, "public");
await png(iconSvg(32), 32, path.join(publicDir, "favicon-32.png"));
await png(iconSvg(180), 180, path.join(publicDir, "apple-touch-icon.png"));
await png(iconSvg(192), 192, path.join(publicDir, "icon-192.png"));
await png(iconSvg(512), 512, path.join(publicDir, "icon-512.png"));
await png(iconSvg(512, { rounded: false, pad: 64 }), 512, path.join(publicDir, "icon-maskable-512.png"));

async function exists(target) {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}

const splashSvg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920" viewBox="0 0 1080 1920">
  <rect width="1080" height="1920" fill="#10211c"/>
  <g transform="translate(390 760) scale(4.7)">${mark}</g>
  <text x="540" y="1180" text-anchor="middle" font-family="Georgia, serif" font-size="72" fill="#e8f2ec">DeyeView</text>
</svg>`);

const androidRoot = path.join(root, "android/app/src/main");
if (await exists(androidRoot)) {
const androidSizes = [
  ["mipmap-mdpi", 48],
  ["mipmap-hdpi", 72],
  ["mipmap-xhdpi", 96],
  ["mipmap-xxhdpi", 144],
  ["mipmap-xxxhdpi", 192],
];
for (const [folder, size] of androidSizes) {
  const dir = path.join(root, "android/app/src/main/res", folder);
  await png(iconSvg(size), size, path.join(dir, "ic_launcher.png"));
  await png(iconSvg(size), size, path.join(dir, "ic_launcher_round.png"));
  await png(iconSvg(size, { rounded: false, pad: Math.round(size * 0.18) }), size, path.join(dir, "ic_launcher_foreground.png"));
}

await mkdir(path.join(androidRoot, "res/drawable"), { recursive: true });
await sharp(splashSvg).png().toFile(path.join(androidRoot, "res/drawable/splash.png"));
await writeFile(path.join(androidRoot, "res/drawable/splash_background.xml"), `<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle">
  <solid android:color="#10211c"/>
</shape>
`);
}

const iosSet = path.join(root, "ios/App/App/Assets.xcassets/AppIcon.appiconset");
if (await exists(path.dirname(iosSet))) {
const iosSizes = [20, 29, 40, 58, 60, 76, 80, 87, 120, 152, 167, 180, 1024];
for (const size of iosSizes) {
  await png(iconSvg(size, { rounded: false }), size, path.join(iosSet, `icon-${size}.png`));
}
await png(iconSvg(1024, { rounded: false }), 1024, path.join(iosSet, "AppIcon-512@2x.png"));
const splashIos = path.join(root, "ios/App/App/Assets.xcassets/Splash.imageset");
await mkdir(splashIos, { recursive: true });
await sharp(splashSvg).resize(2732, 2732, { fit: "cover" }).png().toFile(path.join(splashIos, "splash-2732x2732.png"));
await sharp(splashSvg).resize(2732, 2732, { fit: "cover" }).png().toFile(path.join(splashIos, "splash-2732x2732-1.png"));
await sharp(splashSvg).resize(2732, 2732, { fit: "cover" }).png().toFile(path.join(splashIos, "splash-2732x2732-2.png"));
}

console.log("icons ready");
