import { Settings } from "lucide-react";
import { EnergyFlow } from "@/components/EnergyFlow";
import { PullToRefresh } from "@/components/PullToRefresh";
import { formatKwh, formatMoney, formatPower } from "@/domain/format";
import { paybackProgressLabel } from "@/domain/payback";
import type { PlantProfile, SceneMode } from "@/domain/types";
import { csvFilename, buildEarningsCsv } from "@/domain/csv";
import { zonedParts } from "@/domain/time";
import { shareCsv } from "@/platform/export-report";
import { haptic } from "@/platform/native";
import { useDashboard } from "@/state/useDashboard";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export function DashboardScreen({
  profile,
  onProfile,
  onSettings,
  onConnect,
}: {
  profile: PlantProfile;
  onProfile: (profile: PlantProfile) => void;
  onSettings: () => void;
  onConnect: () => void;
}) {
  const { model, error, loading, refreshing, secondsLeft, refreshNow } = useDashboard(profile, onProfile);
  const [span, setSpan] = useState<"day" | "month">("day");
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  async function setScene(scene: SceneMode) {
    await haptic("light");
    onProfile({ ...profile, scene });
  }

  async function exportReport() {
    if (!model) return;
    setExporting(true);
    setExportError(null);
    try {
      const ymd = zonedParts(model.sample.ts, profile.timeZone).ymd;
      await shareCsv(csvFilename(ymd), buildEarningsCsv(model.report, profile.currency, profile.plantName));
      await haptic("success");
    } catch (err) {
      setExportError(err instanceof Error ? err.message : "Could not export the report.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex items-start justify-between gap-3 px-5 pt-[max(0.85rem,env(safe-area-inset-top))]">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.16em] text-muted">{profile.city || "Your plant"}</p>
          <h1 className="truncate font-display text-[1.7rem] leading-tight">{profile.plantName}</h1>
          <button type="button" className="mt-1 text-left text-xs text-muted" onClick={() => void refreshNow()}>
            {profile.mode === "demo" ? "Simulated live" : "Deye Cloud"} · refresh in {secondsLeft}s
            {refreshing ? " · updating" : ""}
          </button>
        </div>
        <button type="button" className="grid size-11 shrink-0 place-items-center rounded-full bg-white/8 ring-1 ring-white/10" onClick={onSettings} aria-label="Settings">
          <Settings className="size-5" />
        </button>
      </header>
      {profile.mode === "demo" ? (
        <div className="px-5 pt-3">
          <button type="button" onClick={onConnect} className="rounded-full bg-marigold/15 px-3 py-1.5 text-xs font-medium text-marigold">
            Demo Mode · Connect Inverter
          </button>
        </div>
      ) : null}
      <PullToRefresh onRefresh={refreshNow}>
        <div className="space-y-4 px-5 py-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          {loading && !model ? <p className="py-16 text-center text-sm text-muted">Reading the roof…</p> : null}
          {error ? (
            <div className="rounded-3xl bg-clay/15 px-4 py-3 text-sm text-clay">
              <p>{error}</p>
              <button type="button" className="mt-2 font-medium underline" onClick={() => void refreshNow()}>
                Try again
              </button>
            </div>
          ) : null}
          {model ? (
            <>
              <EnergyFlow sample={model.sample} hero={model.hero} scene={profile.scene} photo={profile.housePhoto} showcase={model.showcase} onScene={(scene) => void setScene(scene)} />
              <section className="rounded-3xl bg-panel p-4 ring-1 ring-white/10">
                <div className="flex items-center gap-4">
                  <div
                    className="grid size-[88px] place-items-center rounded-full"
                    style={{ background: `conic-gradient(#8ed9cb ${Math.max(0, Math.min(100, model.sample.batterySoc)) * 3.6}deg, rgba(255,255,255,0.08) 0deg)` }}
                    aria-hidden="true"
                  >
                    <div className="grid size-[68px] place-items-center rounded-full bg-panel text-lg font-semibold tabular-nums">{Math.round(model.sample.batterySoc)}%</div>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.14em] text-muted">Battery</p>
                    <p className="font-display text-[1.65rem] leading-tight">{model.runtime.label}</p>
                    <p className="mt-1 text-sm text-muted">
                      {formatKwh(model.runtime.remainingKwh)} kWh above {Math.round(model.runtime.reserveSoc)}% · {formatPower(model.sample.batteryW)}
                    </p>
                  </div>
                </div>
              </section>
              <section className="rounded-3xl bg-panel p-4 ring-1 ring-white/10">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.14em] text-muted">Savings</p>
                    <p className="font-display text-3xl tabular-nums">{formatMoney(span === "day" ? model.todayEarnings.total : model.cycleEarnings.total, profile.currency)}</p>
                  </div>
                  <div className="flex rounded-full bg-black/25 p-1 text-xs" role="group" aria-label="Savings period">
                    {(["day", "month"] as const).map((option) => (
                      <button
                        key={option}
                        type="button"
                        className={`rounded-full px-3 py-1.5 capitalize ${span === option ? "bg-marigold text-ink" : "text-muted"}`}
                        onClick={() => {
                          setSpan(option);
                          void haptic("light");
                        }}
                        aria-pressed={span === option}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>
                <p className="mt-2 text-sm text-muted">
                  {span === "day"
                    ? `${formatKwh(model.todayEarnings.selfSuppliedKwh)} kWh kept off the grid today`
                    : `${model.cycleLabel} · ${formatKwh(model.cycleEarnings.selfSuppliedKwh)} kWh self-supplied`}
                </p>
                <p className="mt-1 text-xs text-muted">
                  {formatMoney(profile.ratePerKwh, profile.currency)} / kWh
                  {profile.feedInRate > 0 ? ` · feed-in ${formatMoney(profile.feedInRate, profile.currency)}` : ""}
                </p>
              </section>
              <section className="rounded-3xl bg-panel p-4 ring-1 ring-white/10">
                <div className="mb-3 flex items-baseline justify-between">
                  <h2 className="font-medium">30-day generation</h2>
                  <span className="text-xs text-muted">{model.chart.length} days</span>
                </div>
                {model.chart.length === 0 ? (
                  <p className="text-sm text-muted">History will fill in after the first station sync.</p>
                ) : (
                  <div className="flex h-28 items-end gap-[3px]" aria-label="Daily production">
                    {model.chart.map((day) => {
                      const max = Math.max(...model.chart.map((item) => item.productionKwh), 0.1);
                      return (
                        <div key={day.period} className="flex h-full flex-1 items-end" title={`${day.label}: ${day.productionKwh.toFixed(1)} kWh`}>
                          <div className="w-full rounded-t bg-lime/85" style={{ height: `${Math.max(6, (day.productionKwh / max) * 100)}%` }} />
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
              <section className="grid grid-cols-3 gap-2" aria-label="Records">
                <Record title="Best day" value={model.records.bestDay ? formatKwh(model.records.bestDay.kwh) : "—"} detail={model.records.bestDay?.label ?? "Waiting"} />
                <Record title="30-day avg" value={model.records.average ? formatKwh(model.records.average.kwh) : "—"} detail={model.records.average ? `${formatMoney(model.records.average.amount, profile.currency)}` : "Waiting"} />
                <Record title="Best month" value={model.records.bestMonth ? formatMoney(model.records.bestMonth.amount, profile.currency) : "—"} detail={model.records.bestMonth?.label ?? "Waiting"} />
              </section>
              <section className="rounded-3xl bg-panel p-4 ring-1 ring-white/10">
                <div className="flex items-baseline justify-between gap-3">
                  <h2 className="font-medium">Solar payback</h2>
                  <span className="text-sm tabular-nums text-marigold">{model.payback.systemCost > 0 ? `${model.payback.paidOffPct.toFixed(0)}%` : ""}</span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-marigold" style={{ width: `${model.payback.paidOffPct}%` }} />
                </div>
                <p className="mt-3 text-sm text-muted">{paybackProgressLabel(model.payback)}</p>
                {model.payback.systemCost > 0 ? (
                  <p className="mt-1 text-xs text-muted">
                    Saved {formatMoney(model.payback.totalSaved, profile.currency)} of {formatMoney(model.payback.systemCost, profile.currency)}
                  </p>
                ) : null}
              </section>
              <section className="rounded-3xl bg-panel p-4 ring-1 ring-white/10">
                <div className="flex items-baseline justify-between">
                  <h2 className="font-medium">Generation forecast</h2>
                  <span className="text-xs text-muted">{model.forecastSource === "open-meteo" ? "Open-Meteo" : "On-device estimate"}</span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <ForecastDay title="Today" label={model.forecast.today.label} kwh={model.forecast.today.estKwh} temp={model.tempC} />
                  <ForecastDay title="Tomorrow" label={model.forecast.tomorrow.label} kwh={model.forecast.tomorrow.estKwh} temp={model.forecast.tomorrow.tempC} />
                </div>
                <p className="mt-3 text-sm leading-relaxed text-muted">{model.forecast.tip}</p>
              </section>
              <Button className="w-full" variant="secondary" disabled={exporting} onClick={() => void exportReport()}>
                {exporting ? "Preparing report…" : "Export CSV report"}
              </Button>
              {exportError ? <p className="text-center text-sm text-clay">{exportError}</p> : null}
              <p className="text-center text-[11px] leading-relaxed text-muted">
                {model.clockLabel}
                {model.weatherLabel ? ` · ${model.weatherLabel}` : ""}
                {model.sample.acV != null ? ` · ${model.sample.acV.toFixed(0)} V` : ""}
              </p>
            </>
          ) : null}
        </div>
      </PullToRefresh>
    </div>
  );
}

function Record({ title, value, detail }: { title: string; value: string; detail: string }) {
  return (
    <article className="rounded-3xl bg-panel px-3 py-3 ring-1 ring-white/10">
      <p className="text-[10px] uppercase tracking-[0.12em] text-muted">{title}</p>
      <p className="mt-1 text-sm font-semibold tabular-nums">{value}</p>
      <p className="mt-1 truncate text-[11px] text-muted">{detail}</p>
    </article>
  );
}

function ForecastDay({ title, label, kwh, temp }: { title: string; label: string; kwh: number; temp: number | null }) {
  return (
    <div className="rounded-2xl bg-black/20 px-3 py-3">
      <p className="text-xs text-muted">{title}</p>
      <p className="mt-1 font-display text-2xl tabular-nums">{kwh.toFixed(1)} <span className="text-sm">kWh</span></p>
      <p className="mt-1 text-xs text-muted">
        {label}
        {temp != null ? ` · ${Math.round(temp)}°C` : ""}
      </p>
    </div>
  );
}
