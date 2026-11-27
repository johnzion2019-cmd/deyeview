import { useEffect, useState, type ReactNode } from "react";
import { BatteryCharging, House, SunMedium, UtilityPole } from "lucide-react";
import { HouseArt } from "@/components/HouseArt";
import type { HeroPeriod } from "@/domain/hero";
import { formatPower, formatSoc } from "@/domain/format";
import type { Sample, SceneMode } from "@/domain/types";
import { cn } from "@/lib/cn";

type Props = {
  sample: Sample;
  hero: HeroPeriod;
  scene: SceneMode;
  photo: string | null;
  showcase: boolean;
  onScene: (scene: SceneMode) => void;
};

function Particles({ d, color, on }: { d: string; color: string; on: boolean }) {
  if (!on) return null;
  return (
    <g>
      {[0, 1, 2].map((index) => (
        <circle key={index} r="3.3" fill={color}>
          <animateMotion dur="3.2s" repeatCount="indefinite" begin={`${index * 1.05}s`} path={d} />
        </circle>
      ))}
    </g>
  );
}

function Node({
  className,
  label,
  value,
  detail,
  icon,
  tone,
}: {
  className: string;
  label: string;
  value: string;
  detail: string;
  icon: ReactNode;
  tone: string;
}) {
  return (
    <div className={cn("absolute w-[104px] -translate-x-1/2 rounded-2xl border border-white/15 bg-[#10211c]/80 px-2.5 py-2 shadow-lg backdrop-blur-md", className)}>
      <div className="flex items-center gap-1.5 text-[11px] text-white/75">
        <span className={cn("grid size-5 place-items-center rounded-full", tone)}>{icon}</span>
        {label}
      </div>
      <div className="mt-1 text-[15px] font-semibold leading-none tabular-nums text-white">{value}</div>
      <div className="mt-1 text-[10px] text-white/65">{detail}</div>
    </div>
  );
}

export function EnergyFlow({ sample, hero, scene, photo, showcase, onScene }: Props) {
  const [motion, setMotion] = useState(true);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setMotion(!media.matches);
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);

  const offGrid = sample.gridStatus === "off-grid";
  const pvToHome = "M 78 128 C 100 170, 130 210, 168 268";
  const gridImport = "M 286 128 C 260 176, 230 214, 198 268";
  const gridExport = "M 198 268 C 230 214, 260 176, 286 128";
  const batteryOut = "M 180 392 C 180 360, 180 330, 180 300";
  const batteryIn = "M 180 300 C 180 330, 180 360, 180 392";
  const batteryDetail = sample.batteryW < -30 ? "Charging" : sample.batteryW > 30 ? "Discharging" : "Idle";
  const gridDetail = offGrid ? "Off grid" : sample.gridW < -30 ? "Exporting" : sample.gridW > 30 ? "Importing" : "Idle";

  return (
    <section className="relative overflow-hidden rounded-[28px] ring-1 ring-white/10" aria-label="Energy flow">
      <div className="relative h-[460px]">
        {photo ? (
          <img src={photo} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div className="absolute inset-0">
            <HouseArt period={hero} />
          </div>
        )}
        <div className={cn("absolute inset-0", photo ? "bg-gradient-to-b from-ink/25 via-ink/10 to-ink/75" : "bg-gradient-to-b from-transparent via-transparent to-ink/35")} />
        <svg viewBox="0 0 360 520" className="absolute inset-0 h-full w-full" aria-hidden="true">
          <path d={pvToHome} fill="none" stroke="#d6f25c" strokeOpacity="0.45" strokeWidth="2" />
          <path d={gridImport} fill="none" stroke="#9ecbff" strokeOpacity={offGrid ? 0.12 : 0.4} strokeWidth="2" />
          <path d={batteryOut} fill="none" stroke="#8ed9cb" strokeOpacity="0.45" strokeWidth="2" />
          {motion && sample.pvW > 25 ? <Particles d={pvToHome} color="#d6f25c" on /> : null}
          {motion && !offGrid && sample.gridW > 30 ? <Particles d={gridImport} color="#9ecbff" on /> : null}
          {motion && !offGrid && sample.gridW < -30 ? <Particles d={gridExport} color="#9ecbff" on /> : null}
          {motion && sample.batteryW > 30 ? <Particles d={batteryOut} color="#8ed9cb" on /> : null}
          {motion && sample.batteryW < -30 ? <Particles d={batteryIn} color="#8ed9cb" on /> : null}
        </svg>
        <div className="absolute left-3 top-3 flex items-center gap-2">
          <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-medium", offGrid ? "bg-clay/90 text-white" : "bg-[#12352c]/80 text-lime")}>
            {offGrid ? "Off grid" : "On grid"}
          </span>
          {showcase ? <span className="rounded-full bg-black/35 px-2.5 py-1 text-[11px] text-white/80">Sunny preview</span> : null}
        </div>
        <div className="absolute right-3 top-3 flex rounded-full bg-black/40 p-1 text-[11px] text-white backdrop-blur-md" role="group" aria-label="House scene">
          {(["auto", "day", "night"] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => onScene(option)}
              className={cn("rounded-full px-2.5 py-1 capitalize", scene === option ? "bg-white text-ink" : "text-white/80")}
              aria-pressed={scene === option}
            >
              {option}
            </button>
          ))}
        </div>
        <Node className="left-[22%] top-[18%]" label="PV Array" value={formatPower(sample.pvW)} detail="Generating" icon={<SunMedium className="size-3" />} tone="bg-lime/20 text-lime" />
        <Node className="left-[78%] top-[18%]" label="Grid" value={formatPower(Math.abs(sample.gridW))} detail={gridDetail} icon={<UtilityPole className="size-3" />} tone="bg-sky-200/20 text-sky-100" />
        <Node className="left-1/2 top-[52%]" label="Home Load" value={formatPower(sample.loadW)} detail={sample.operatingMode} icon={<House className="size-3" />} tone="bg-marigold/20 text-marigold" />
        <Node className="left-1/2 top-[78%]" label="Battery" value={formatSoc(sample.batterySoc)} detail={batteryDetail} icon={<BatteryCharging className="size-3" />} tone="bg-tide/20 text-tide" />
      </div>
    </section>
  );
}
