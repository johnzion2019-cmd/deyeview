import { useEffect } from "react";
import { startDashboardBanner } from "@/platform/ads";

/**
 * Reserves the strip under the scrolling dashboard where the native adaptive banner sits.
 * The banner is a native overlay pinned to the safe area, so this slot keeps it off the
 * energy-flow hero, the pull-to-refresh scroller, and any future bottom navigation.
 * Height stays 0 until an ad actually loads.
 */
export function DashboardAdBanner({ reservePx, onReserve }: { reservePx: number; onReserve: (px: number) => void }) {
  useEffect(() => {
    let alive = true;
    const session = startDashboardBanner((px) => {
      if (alive) onReserve(px);
    });
    return () => {
      alive = false;
      void session.stop();
    };
  }, [onReserve]);

  if (reservePx <= 0) return null;
  return (
    <div
      aria-hidden="true"
      className="shrink-0"
      style={{ height: `calc(${reservePx}px + env(safe-area-inset-bottom, 0px))` }}
    />
  );
}
