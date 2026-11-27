import { useEffect, useState } from "react";
import { Mark } from "@/components/Mark";
import { DEMO_PROFILE } from "@/domain/profile";
import type { PlantProfile } from "@/domain/types";
import { haptic } from "@/platform/native";
import { clearLocalData, loadProfile, saveProfile } from "@/platform/storage";
import { DashboardScreen } from "@/screens/DashboardScreen";
import { SettingsScreen } from "@/screens/SettingsScreen";
import { SetupScreen } from "@/screens/SetupScreen";
import { WelcomeScreen } from "@/screens/WelcomeScreen";

type Route = "welcome" | "setup" | "dashboard" | "settings";

export function App() {
  const [booting, setBooting] = useState(true);
  const [profile, setProfile] = useState<PlantProfile | null>(null);
  const [route, setRoute] = useState<Route>("welcome");

  useEffect(() => {
    let alive = true;
    void loadProfile().then((stored) => {
      if (!alive) return;
      setProfile(stored);
      setRoute(stored ? "dashboard" : "welcome");
      setBooting(false);
    });
    return () => {
      alive = false;
    };
  }, []);

  async function persist(next: PlantProfile, destination: Route = "dashboard") {
    setProfile(next);
    await saveProfile(next);
    setRoute(destination);
  }

  if (booting) {
    return (
      <div className="grid min-h-dvh place-items-center">
        <div className="text-center">
          <Mark className="mx-auto size-16" />
          <p className="mt-4 font-display text-2xl">DeyeView</p>
        </div>
      </div>
    );
  }

  if (route === "setup") {
    return (
      <SetupScreen
        initial={profile && (profile.appId || profile.mode === "deye") ? profile : null}
        onCancel={() => setRoute(profile ? "dashboard" : "welcome")}
        onSave={persist}
      />
    );
  }

  if (!profile || route === "welcome") {
    return (
      <WelcomeScreen
        onConnect={() => {
          void haptic("light");
          setRoute("setup");
        }}
        onDemo={() => {
          void haptic("success");
          void persist({ ...DEMO_PROFILE });
        }}
      />
    );
  }

  if (route === "settings") {
    return (
      <SettingsScreen
        profile={profile}
        onBack={() => setRoute("dashboard")}
        onEdit={() => setRoute("setup")}
        onMode={(mode) => {
          void haptic("light");
          void persist({ ...profile, mode });
        }}
        onClear={async () => {
          await clearLocalData();
          setProfile(null);
          setRoute("welcome");
        }}
      />
    );
  }

  return (
    <DashboardScreen
      profile={profile}
      onProfile={(next) => {
        setProfile(next);
        void saveProfile(next);
      }}
      onSettings={() => {
        void haptic("light");
        setRoute("settings");
      }}
      onConnect={() => {
        void haptic("light");
        setRoute("setup");
      }}
    />
  );
}
