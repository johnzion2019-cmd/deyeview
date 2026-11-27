import { useState, type ReactNode } from "react";
import { ChevronLeft } from "lucide-react";
import { CURRENCIES } from "@/domain/currencies";
import { DeyeError } from "@/domain/deye";
import { PLACES, TIME_ZONES } from "@/domain/places";
import { blankProfile } from "@/domain/profile";
import type { PlantProfile, RegionId } from "@/domain/types";
import { compressHousePhoto } from "@/platform/photo";
import { haptic } from "@/platform/native";
import { fetchLiveSnapshot } from "@/services/live";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const STEPS = ["Region", "Login", "Tariff", "System", "Place", "House", "Connect"] as const;

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <Label>{label}</Label>
      <div className="mt-1.5">{children}</div>
      {hint ? <p className="mt-1.5 text-xs leading-relaxed text-muted">{hint}</p> : null}
    </label>
  );
}

const selectClass =
  "h-12 w-full rounded-2xl border border-white/10 bg-black/25 px-3.5 text-base text-mist outline-none focus:border-marigold";

export function SetupScreen({
  initial,
  onCancel,
  onSave,
}: {
  initial: PlantProfile | null;
  onCancel: () => void;
  onSave: (profile: PlantProfile) => Promise<void>;
}) {
  const editing = Boolean(initial && initial.mode === "deye" && initial.deviceSn);
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<PlantProfile>(initial ? { ...initial, mode: "deye" } : blankProfile());
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

  function patch(partial: Partial<PlantProfile>) {
    setDraft((current) => ({ ...current, ...partial }));
    setError(null);
  }

  function validate(index: number): string | null {
    if (index === 1) {
      if (!draft.appId.trim() || !draft.appSecret.trim()) return "App ID and App Secret come from the Deye developer portal.";
      if (!draft.email.includes("@")) return "Enter the email on the Deye Cloud account.";
      if (!draft.password && !editing) return "Enter the Deye Cloud password. It is hashed on this phone before it is sent.";
      if (!draft.deviceSn.trim()) return "Enter the inverter serial number.";
    }
    if (index === 2) {
      if (!draft.plantName.trim()) return "Give the plant a name.";
      if (!Number.isFinite(draft.ratePerKwh) || draft.ratePerKwh < 0) return "Enter an electricity rate of zero or more.";
      if (!Number.isFinite(draft.feedInRate) || draft.feedInRate < 0) return "Enter a feed-in rate of zero or more.";
      if (!Number.isFinite(draft.billingCycleDay) || draft.billingCycleDay < 1 || draft.billingCycleDay > 31) return "Billing cycle day must be from 1 to 31.";
    }
    if (index === 3) {
      if (!Number.isFinite(draft.batteryKwh) || draft.batteryKwh <= 0) return "Enter the battery capacity in kWh.";
      if (!Number.isFinite(draft.ratedW) || draft.ratedW < 100) return "Enter the inverter’s rated power in watts.";
      if (!Number.isFinite(draft.reserveSoc) || draft.reserveSoc < 0 || draft.reserveSoc > 90) return "Reserve should be between 0% and 90%.";
      if (!Number.isFinite(draft.systemCost) || draft.systemCost < 0) return "Install cost should be zero or more.";
    }
    if (index === 4) {
      if (!draft.city.trim()) return "Choose a city or type one.";
      if (draft.lat < -90 || draft.lat > 90 || draft.lon < -180 || draft.lon > 180) return "Check the latitude and longitude.";
    }
    return null;
  }

  function next() {
    const problem = validate(step);
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    setStep((value) => Math.min(STEPS.length - 1, value + 1));
    void haptic("light");
  }

  async function connect() {
    const problem = [1, 2, 3, 4].map(validate).find(Boolean);
    if (problem) {
      setError(problem);
      return;
    }
    setBusy(true);
    setError(null);
    const profile: PlantProfile = {
      ...draft,
      mode: "deye",
      password: draft.password || initial?.password || "",
      token: null,
    };
    try {
      const live = await fetchLiveSnapshot(profile);
      await onSave({ ...live.profile, mode: "deye" });
      await haptic("success");
    } catch (err) {
      const message = err instanceof DeyeError ? err.message : err instanceof Error ? err.message : "Could not reach Deye Cloud.";
      setError(message);
      await haptic("warn");
    } finally {
      setBusy(false);
    }
  }

  async function onPhoto(file: File | undefined) {
    if (!file) return;
    setPhotoError(null);
    try {
      patch({ housePhoto: await compressHousePhoto(file) });
      await haptic("light");
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : "Could not use that photo.");
    }
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex items-center gap-2 px-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <button type="button" className="grid size-11 place-items-center rounded-full text-mist" onClick={step === 0 ? onCancel : () => setStep((value) => value - 1)} aria-label={step === 0 ? "Close setup" : "Back"}>
          <ChevronLeft />
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-xs uppercase tracking-[0.16em] text-muted">Step {step + 1} of {STEPS.length}</p>
          <h1 className="truncate font-display text-2xl">{STEPS[step]}</h1>
        </div>
      </header>
      <div className="mx-5 mt-3 h-1 overflow-hidden rounded-full bg-white/10">
        <div className="h-full bg-marigold" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
      </div>
      <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
        {step === 0 ? (
          <div className="space-y-3">
            <p className="text-sm leading-relaxed text-muted">Pick the datacenter your Deye Cloud account uses. The Philippines and most of EMEA and APAC are on the EU host. The Americas use the US host.</p>
            {(
              [
                ["eu", "EMEA / APAC", "eu1-developer.deyecloud.com"],
                ["us", "Americas", "us1-developer.deyecloud.com"],
              ] as const
            ).map(([id, title, host]) => (
              <button
                key={id}
                type="button"
                onClick={() => patch({ region: id as RegionId })}
                className={`w-full rounded-3xl border px-4 py-4 text-left ${draft.region === id ? "border-marigold bg-marigold/10" : "border-white/10 bg-panel"}`}
              >
                <span className="block font-medium">{title}</span>
                <span className="mt-1 block text-xs text-muted">{host}</span>
              </button>
            ))}
          </div>
        ) : null}
        {step === 1 ? (
          <div className="space-y-4">
            <Field label="App ID" hint="Create an application at developer.deyecloud.com and copy the App ID.">
              <Input value={draft.appId} autoCapitalize="none" autoCorrect="off" onChange={(event) => patch({ appId: event.target.value })} />
            </Field>
            <Field label="App Secret">
              <Input value={draft.appSecret} autoCapitalize="none" autoCorrect="off" onChange={(event) => patch({ appSecret: event.target.value })} />
            </Field>
            <Field label="Deye email">
              <Input type="email" inputMode="email" autoCapitalize="none" value={draft.email} onChange={(event) => patch({ email: event.target.value })} />
            </Field>
            <Field label="Password" hint="Hashed with SHA-256 on this device, then sent only to Deye Cloud. A 64-character hex digest is sent as-is.">
              <Input type="password" value={draft.password} placeholder={editing ? "Saved on this device" : ""} onChange={(event) => patch({ password: event.target.value })} />
            </Field>
            <Field label="Inverter serial number">
              <Input value={draft.deviceSn} autoCapitalize="characters" onChange={(event) => patch({ deviceSn: event.target.value })} />
            </Field>
            <Field label="Company ID" hint="Leave blank for a personal Deye Cloud account.">
              <Input value={draft.companyId} onChange={(event) => patch({ companyId: event.target.value })} />
            </Field>
          </div>
        ) : null}
        {step === 2 ? (
          <div className="space-y-4">
            <Field label="Plant name">
              <Input value={draft.plantName} onChange={(event) => patch({ plantName: event.target.value })} />
            </Field>
            <Field label="Currency">
              <select className={selectClass} value={draft.currency} onChange={(event) => patch({ currency: event.target.value })}>
                {CURRENCIES.map((currency) => (
                  <option key={currency.code} value={currency.code}>
                    {currency.code} · {currency.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Electricity rate per kWh">
              <Input inputMode="decimal" value={String(draft.ratePerKwh)} onChange={(event) => patch({ ratePerKwh: Number(event.target.value) })} />
            </Field>
            <Field label="Feed-in rate per kWh" hint="Use 0 if exported energy is not paid.">
              <Input inputMode="decimal" value={String(draft.feedInRate)} onChange={(event) => patch({ feedInRate: Number(event.target.value) })} />
            </Field>
            <Field label="Billing cycle day" hint="1–31. Shorter months clamp to the last day.">
              <Input inputMode="numeric" value={String(draft.billingCycleDay)} onChange={(event) => patch({ billingCycleDay: Number(event.target.value) })} />
            </Field>
          </div>
        ) : null}
        {step === 3 ? (
          <div className="space-y-4">
            <Field label="Battery capacity (kWh)">
              <Input inputMode="decimal" value={String(draft.batteryKwh)} onChange={(event) => patch({ batteryKwh: Number(event.target.value) })} />
            </Field>
            <Field label="Rated inverter power (W)" hint="Nameplate AC power, for example 8000.">
              <Input inputMode="numeric" value={String(draft.ratedW)} onChange={(event) => patch({ ratedW: Number(event.target.value) })} />
            </Field>
            <Field label="Reserve state of charge (%)" hint="Runtime is the time until the battery reaches this reserve while discharging.">
              <Input inputMode="numeric" value={String(draft.reserveSoc)} onChange={(event) => patch({ reserveSoc: Number(event.target.value) })} />
            </Field>
            <Field label="System install cost" hint="Used only for the payback tracker. Use 0 to hide a date.">
              <Input inputMode="decimal" value={String(draft.systemCost)} onChange={(event) => patch({ systemCost: Number(event.target.value) })} />
            </Field>
          </div>
        ) : null}
        {step === 4 ? (
          <div className="space-y-4">
            <Field label="City">
              <select
                className={selectClass}
                value={PLACES.some((place) => place.city === draft.city) ? draft.city : ""}
                onChange={(event) => {
                  const place = PLACES.find((item) => item.city === event.target.value);
                  if (place) patch({ city: place.city, lat: place.lat, lon: place.lon, timeZone: place.timeZone });
                }}
              >
                <option value="">Choose a starting point</option>
                {PLACES.map((place) => (
                  <option key={place.city} value={place.city}>
                    {place.city}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="City name">
              <Input value={draft.city} onChange={(event) => patch({ city: event.target.value })} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Latitude">
                <Input inputMode="decimal" value={String(draft.lat)} onChange={(event) => patch({ lat: Number(event.target.value) })} />
              </Field>
              <Field label="Longitude">
                <Input inputMode="decimal" value={String(draft.lon)} onChange={(event) => patch({ lon: Number(event.target.value) })} />
              </Field>
            </div>
            <Field label="Time zone">
              <select className={selectClass} value={draft.timeZone} onChange={(event) => patch({ timeZone: event.target.value })}>
                {TIME_ZONES.map((zone) => (
                  <option key={zone} value={zone}>
                    {zone}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        ) : null}
        {step === 5 ? (
          <div className="space-y-4">
            <p className="text-sm leading-relaxed text-muted">Optional. A photo of your house sits behind the energy flow. It stays on this device. The built-in day and night artwork is used until you add one.</p>
            {draft.housePhoto ? <img src={draft.housePhoto} alt="Your house" className="h-44 w-full rounded-3xl object-cover" /> : null}
            <Input className="h-auto py-3" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void onPhoto(event.target.files?.[0])} />
            {draft.housePhoto ? (
              <Button variant="secondary" onClick={() => patch({ housePhoto: null })}>
                Use the built-in house
              </Button>
            ) : null}
            {photoError ? <p className="text-sm text-clay">{photoError}</p> : null}
          </div>
        ) : null}
        {step === 6 ? (
          <div className="space-y-3 rounded-3xl bg-panel p-4 ring-1 ring-white/10">
            <Row label="Region" value={draft.region === "us" ? "Americas" : "EMEA / APAC"} />
            <Row label="Plant" value={draft.plantName || "—"} />
            <Row label="Serial" value={draft.deviceSn || "—"} />
            <Row label="Rate" value={`${draft.ratePerKwh} ${draft.currency}/kWh`} />
            <Row label="Battery" value={`${draft.batteryKwh} kWh · ${draft.ratedW} W`} />
            <Row label="Place" value={`${draft.city || "—"} · ${draft.timeZone}`} />
            <p className="pt-2 text-xs leading-relaxed text-muted">Test & connect signs in to Deye Cloud from this phone, saves the token locally, and opens the dashboard.</p>
          </div>
        ) : null}
        {error ? <p className="rounded-2xl bg-clay/15 px-3 py-2 text-sm text-clay">{error}</p> : null}
      </div>
      <footer className="px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2">
        {step < STEPS.length - 1 ? (
          <Button className="w-full" size="lg" onClick={next}>
            Continue
          </Button>
        ) : (
          <Button className="w-full" size="lg" disabled={busy} onClick={() => void connect()}>
            {busy ? "Contacting Deye Cloud…" : "Test & connect"}
          </Button>
        )}
      </footer>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-sm">
      <span className="text-muted">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
