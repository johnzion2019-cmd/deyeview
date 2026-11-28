import { useEffect, useRef, useState } from "react";
import { ChevronLeft } from "lucide-react";
import { ADS_DEV_TOGGLE_TAPS } from "@/config/ads";
import { isProEnabled } from "@/features/pro/flags";
import { profileHasCredentials } from "@/domain/profile";
import type { PlantProfile } from "@/domain/types";
import { loadAdsPreference, openAdPrivacyChoices, resetAdvertisingSession, saveAdsPreference } from "@/platform/ads";
import { haptic } from "@/platform/native";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

export function SettingsScreen({
  profile,
  onBack,
  onEdit,
  onMode,
  onClear,
}: {
  profile: PlantProfile;
  onBack: () => void;
  onEdit: () => void;
  onMode: (mode: PlantProfile["mode"]) => void;
  onClear: () => Promise<void>;
}) {
  const [confirm, setConfirm] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [adsEnabled, setAdsEnabled] = useState(true);
  const [forceTestAds, setForceTestAds] = useState(false);
  const [devAds, setDevAds] = useState(false);
  const [openingChoices, setOpeningChoices] = useState(false);
  const [adChoiceNote, setAdChoiceNote] = useState<string | null>(null);
  const versionTaps = useRef(0);
  const hasLogin = profileHasCredentials(profile);

  useEffect(() => {
    let alive = true;
    void loadAdsPreference().then((preference) => {
      if (!alive) return;
      setAdsEnabled(preference.adsEnabled);
      setForceTestAds(preference.forceTestAds);
    });
    return () => {
      alive = false;
    };
  }, []);

  async function openAdChoices() {
    setOpeningChoices(true);
    try {
      const result = await openAdPrivacyChoices();
      setAdChoiceNote(result.message ?? null);
    } finally {
      setOpeningChoices(false);
    }
  }

  async function toggleDeveloperAds() {
    const next = !adsEnabled;
    setAdsEnabled(next);
    await saveAdsPreference({ adsEnabled: next, forceTestAds });
    await haptic("light");
  }

  async function toggleForceTestAds() {
    const next = !forceTestAds;
    setForceTestAds(next);
    await saveAdsPreference({ adsEnabled, forceTestAds: next });
    resetAdvertisingSession();
    await haptic("light");
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex items-center gap-2 px-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <button type="button" className="grid size-11 place-items-center rounded-full" onClick={onBack} aria-label="Back to dashboard">
          <ChevronLeft />
        </button>
        <h1 className="font-display text-3xl">Settings</h1>
      </header>
      <div className="space-y-6 px-5 py-4 pb-[max(2rem,env(safe-area-inset-bottom))]">
        <section className="space-y-3">
          <h2 className="text-xs uppercase tracking-[0.16em] text-muted">This plant</h2>
          <div className="rounded-3xl bg-panel p-4 ring-1 ring-white/10">
            <p className="font-medium">{profile.plantName}</p>
            <p className="mt-1 text-sm text-muted">
              {profile.mode === "demo" ? "Demo residence" : profile.deviceSn} · {profile.currency} · {profile.city}
            </p>
            <Button className="mt-4" variant="secondary" onClick={onEdit}>
              {hasLogin ? "Edit connection & tariff" : "Connect an inverter"}
            </Button>
          </div>
        </section>
        <section className="space-y-3">
          <h2 className="text-xs uppercase tracking-[0.16em] text-muted">Data source</h2>
          <div className="grid grid-cols-2 gap-2">
            <Button variant={profile.mode === "demo" ? "default" : "secondary"} onClick={() => onMode("demo")}>
              Demo
            </Button>
            <Button
              variant={profile.mode === "deye" ? "default" : "secondary"}
              onClick={() => {
                if (!hasLogin) onEdit();
                else onMode("deye");
              }}
            >
              Live
            </Button>
          </div>
          <p className="text-xs leading-relaxed text-muted">Demo keeps a full interactive plant on this phone. Live reads your inverter from Deye Cloud. Switching does not delete a saved login.</p>
        </section>
        <section className="space-y-2">
          <h2 className="text-xs uppercase tracking-[0.16em] text-muted">Privacy & support</h2>
          <p className="text-xs leading-relaxed text-muted">
            The Android and iOS dashboard may show one Google AdMob banner. DeyeView asks before the first ad. If you decline tracking, the ad is not personalized. The welcome screen, this page, and the browser preview do not show ads.
          </p>
          <button
            type="button"
            className="flex w-full items-center justify-between rounded-2xl bg-panel px-4 py-3 text-left text-sm ring-1 ring-white/10"
            onClick={() => void openAdChoices()}
            disabled={openingChoices}
          >
            Privacy & ad choices
            <span className="text-muted">{openingChoices ? "Opening" : "Manage"}</span>
          </button>
          <div className="rounded-2xl bg-panel px-4 py-3 ring-1 ring-white/10" aria-disabled="true">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span>Remove ads (Pro — coming soon)</span>
              <span className="text-xs text-muted">Pro</span>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-muted">Nothing to buy yet. A future Pro purchase will turn ads off. This row does not charge you.</p>
          </div>
          {devAds ? (
            <div className="space-y-2">
              <Button variant="secondary" className="w-full" onClick={() => void toggleDeveloperAds()}>
                {adsEnabled ? "Developer: ads are on" : "Developer: ads are off"}
              </Button>
              <Button variant="secondary" className="w-full" onClick={() => void toggleForceTestAds()}>
                {forceTestAds ? "Developer: test ads are on" : "Developer: test ads are off"}
              </Button>
              <p className="text-xs leading-relaxed text-muted">
                Hidden switches for this device only. Ads on/off writes adsEnabled and is not a purchase. Test ads forces Google’s sample banner units so a release install does not request a live ad.
              </p>
            </div>
          ) : null}
          <LegalLink href="/privacy.html" title="Privacy Policy" />
          <LegalLink href="/terms.html" title="Terms of Use" />
          <LegalLink href="/support.html" title="Support" />
          <a href="mailto:johnzion2019@gmail.com" className="flex items-center justify-between rounded-2xl bg-panel px-4 py-3 text-sm ring-1 ring-white/10">
            johnzion2019@gmail.com
            <span className="text-muted">Email</span>
          </a>
        </section>
        {isProEnabled("pdfExport") ? <p className="text-sm text-muted">PDF export is part of a future optional Pro pack.</p> : null}
        <section className="space-y-3 rounded-3xl bg-panel p-4 ring-1 ring-white/10">
          <h2 className="font-medium">Disconnect & clear local data</h2>
          <p className="text-sm leading-relaxed text-muted">Removes the Deye login, token, tariff, house photo, and demo choice stored on this device. DeyeView has no server copy to delete.</p>
          <Button variant="danger" onClick={() => setConfirm(true)}>
            Disconnect & Clear Local Data
          </Button>
        </section>
        <button
          type="button"
          className="w-full text-center text-[11px] text-muted"
          aria-label="App version"
          onClick={() => {
            versionTaps.current += 1;
            if (versionTaps.current >= ADS_DEV_TOGGLE_TAPS) setDevAds(true);
          }}
        >
          DeyeView 1.0.0 · com.deyeview.app
        </button>
      </div>
      <Dialog open={adChoiceNote != null} onOpenChange={(open) => { if (!open) setAdChoiceNote(null); }}>
        <DialogContent>
          <DialogTitle>Privacy & ad choices</DialogTitle>
          <DialogDescription>{adChoiceNote}</DialogDescription>
          <Button className="mt-5 w-full" variant="secondary" onClick={() => setAdChoiceNote(null)}>
            OK
          </Button>
        </DialogContent>
      </Dialog>
      <Dialog open={confirm} onOpenChange={setConfirm}>
        <DialogContent>
          <DialogTitle>Clear this device?</DialogTitle>
          <DialogDescription>
            The inverter login and everything you typed into DeyeView will be deleted from this phone. You can connect again later.
          </DialogDescription>
          <div className="mt-5 flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={() => setConfirm(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              className="flex-1"
              disabled={clearing}
              onClick={() => {
                setClearing(true);
                void haptic("warn").then(() => onClear());
              }}
            >
              {clearing ? "Clearing…" : "Clear data"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function LegalLink({ href, title }: { href: string; title: string }) {
  return (
    <a href={href} className="flex items-center justify-between rounded-2xl bg-panel px-4 py-3 text-sm ring-1 ring-white/10">
      {title}
      <span className="text-muted">Open</span>
    </a>
  );
}
