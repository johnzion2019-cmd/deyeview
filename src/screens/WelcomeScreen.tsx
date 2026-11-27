import { Mark } from "@/components/Mark";
import { Button } from "@/components/ui/button";
import { HouseArt } from "@/components/HouseArt";

export function WelcomeScreen({ onConnect, onDemo }: { onConnect: () => void; onDemo: () => void }) {
  return (
    <div className="relative flex min-h-dvh flex-col">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[46%] opacity-80">
        <HouseArt period="day" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-ink" />
      </div>
      <div className="relative flex flex-1 flex-col justify-end px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.25rem,env(safe-area-inset-top))]">
        <Mark />
        <p className="mt-5 text-xs font-medium uppercase tracking-[0.22em] text-marigold">DeyeView</p>
        <h1 className="mt-2 font-display text-[2.6rem] leading-[1.02] text-mist">Your inverter, from the sunny side of the house.</h1>
        <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-muted">
          A private companion for Deye hybrid owners. Live power, savings, battery runtime, and tomorrow’s forecast — read on this phone, never parked on a DeyeView server.
        </p>
        <div className="mt-8 space-y-3">
          <Button className="w-full" size="lg" onClick={onConnect}>
            Connect My Deye Inverter
          </Button>
          <Button className="w-full" size="lg" variant="secondary" onClick={onDemo}>
            Try Live Demo
          </Button>
        </div>
        <p className="mt-4 text-center text-xs text-muted">Free at launch · No ads · No account to create</p>
      </div>
    </div>
  );
}
