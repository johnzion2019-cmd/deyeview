import { useEffect, useRef, useState } from "react";
import { DemoEngine } from "@/services/demo-engine";
import { loadForecast } from "@/services/forecast-loader";
import { fetchLiveSnapshot } from "@/services/live";
import { composeDashboard, type DashboardModel, type EnergySnapshot, type ForecastBundle } from "@/services/snapshot";
import { haptic } from "@/platform/native";
import type { PlantProfile } from "@/domain/types";

const REFRESH_SECONDS = 30;

function engineKey(profile: PlantProfile): string {
  return [profile.mode, profile.lat, profile.lon, profile.timeZone, profile.batteryKwh, profile.ratedW, profile.deviceSn, profile.region].join("|");
}

export function useDashboard(profile: PlantProfile, onProfile: (next: PlantProfile) => void) {
  const profileRef = useRef(profile);
  profileRef.current = profile;
  const onProfileRef = useRef(onProfile);
  onProfileRef.current = onProfile;
  const key = engineKey(profile);
  const engineRef = useRef<{ key: string; engine: DemoEngine } | null>(null);
  const snapshotRef = useRef<EnergySnapshot | null>(null);
  const forecastRef = useRef<{ key: string; at: number; bundle: ForecastBundle } | null>(null);
  const [model, setModel] = useState<DashboardModel | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(REFRESH_SECONDS);

  function paint(snapshot: EnergySnapshot, bundle: ForecastBundle) {
    snapshotRef.current = snapshot;
    setModel(composeDashboard(profileRef.current, snapshot, bundle, Date.now()));
  }

  async function refreshFull() {
    const current = profileRef.current;
    setRefreshing(true);
    try {
      const loaded = await loadForecast(current, forecastRef.current);
      forecastRef.current = loaded.cache;
      if (current.mode === "demo") {
        if (!engineRef.current || engineRef.current.key !== engineKey(current)) {
          await new Promise((resolve) => setTimeout(resolve, 16));
          engineRef.current = { key: engineKey(current), engine: new DemoEngine(current, Date.now()) };
        }
        engineRef.current.engine.tick(Date.now());
        paint(engineRef.current.engine.view(Date.now()), loaded.bundle);
      } else {
        const live = await fetchLiveSnapshot(current);
        if (live.profile.token?.token !== current.token?.token || live.profile.stationId !== current.stationId) {
          onProfileRef.current(live.profile);
        }
        paint(live.snapshot, loaded.bundle);
      }
      setError(null);
      setSecondsLeft(REFRESH_SECONDS);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reach Deye Cloud.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  const refreshRef = useRef(refreshFull);
  refreshRef.current = refreshFull;

  useEffect(() => {
    let alive = true;
    setLoading(true);
    void refreshRef.current().finally(() => {
      if (!alive) return;
    });
    const id = window.setInterval(() => {
      const current = profileRef.current;
      if (current.mode === "demo" && engineRef.current?.key === engineKey(current) && forecastRef.current) {
        engineRef.current.engine.tick(Date.now());
        paint(engineRef.current.engine.view(Date.now()), forecastRef.current.bundle);
      }
      setSecondsLeft((left) => {
        if (left <= 1) {
          void refreshRef.current();
          return REFRESH_SECONDS;
        }
        return left - 1;
      });
    }, 1000);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, [key]);

  useEffect(() => {
    if (!snapshotRef.current || !forecastRef.current) return;
    setModel(composeDashboard(profile, snapshotRef.current, forecastRef.current.bundle, Date.now()));
  }, [profile]);

  async function refreshNow() {
    await haptic("medium");
    await refreshRef.current();
  }

  return { model, error, loading, refreshing, secondsLeft, refreshNow };
}
