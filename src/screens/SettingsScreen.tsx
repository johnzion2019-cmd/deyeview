import { useState } from "react";
import { ChevronLeft } from "lucide-react";
import { isProEnabled } from "@/features/pro/flags";
import { profileHasCredentials } from "@/domain/profile";
import type { PlantProfile } from "@/domain/types";
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
  const hasLogin = profileHasCredentials(profile);

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
        <p className="text-center text-[11px] text-muted">DeyeView 1.0.0 · com.deyeview.app</p>
      </div>
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
