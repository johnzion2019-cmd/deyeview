import { Capacitor } from "@capacitor/core";
import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";
import { SplashScreen } from "@capacitor/splash-screen";
import { StatusBar, Style } from "@capacitor/status-bar";

export async function bootNativeChrome(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await StatusBar.setOverlaysWebView({ overlay: true });
    await StatusBar.setStyle({ style: Style.Light });
    await StatusBar.setBackgroundColor({ color: "#10211c" });
  } catch {
    /* Status bar plugin is unavailable on some webviews. */
  }
  try {
    await SplashScreen.hide({ fadeOutDuration: 280 });
  } catch {
    /* Splash already hidden. */
  }
}

export async function haptic(kind: "light" | "medium" | "success" | "warn"): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    if (kind === "success") await Haptics.notification({ type: NotificationType.Success });
    else if (kind === "warn") await Haptics.notification({ type: NotificationType.Warning });
    else await Haptics.impact({ style: kind === "medium" ? ImpactStyle.Medium : ImpactStyle.Light });
  } catch {
    /* Haptics are optional. */
  }
}
