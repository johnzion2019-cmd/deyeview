import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.deyeview.app",
  appName: "DeyeView",
  webDir: "dist",
  android: {
    allowMixedContent: false,
  },
  ios: {
    contentInset: "never",
  },
  server: {
    androidScheme: "https",
    iosScheme: "https",
  },
  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
    SplashScreen: {
      launchAutoHide: false,
      launchShowDuration: 0,
      backgroundColor: "#10211c",
      androidSplashResourceName: "splash",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: "LIGHT",
      backgroundColor: "#10211c",
      overlaysWebView: true,
    },
  },
};

export default config;
