import type { HeroPeriod } from "@/domain/hero";

export function HouseArt({ period }: { period: HeroPeriod }) {
  const night = period === "night";
  return (
    <svg viewBox="0 0 360 520" className="h-full w-full" aria-hidden="true">
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={night ? "#10243f" : "#f6c98a"} />
          <stop offset="48%" stopColor={night ? "#1a3358" : "#f3e0b8"} />
          <stop offset="100%" stopColor={night ? "#0d1a2b" : "#9ec9c4"} />
        </linearGradient>
        <linearGradient id="ground" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={night ? "#1b3328" : "#8eaf6d"} />
          <stop offset="100%" stopColor={night ? "#10211a" : "#6d8f55"} />
        </linearGradient>
        <linearGradient id="panel" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={night ? "#1d4a3e" : "#1f4d3d"} />
          <stop offset="100%" stopColor={night ? "#12382d" : "#16382c"} />
        </linearGradient>
      </defs>
      <rect width="360" height="520" fill="url(#sky)" />
      {night ? (
        <g>
          <circle cx="286" cy="74" r="22" fill="#f4ecd4" />
          <circle cx="276" cy="68" r="18" fill="#10243f" opacity="0.18" />
          {[
            [40, 48],
            [78, 90],
            [120, 36],
            [210, 58],
            [330, 120],
            [24, 140],
          ].map(([x, y]) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r="1.3" fill="#fff" opacity="0.85" />
          ))}
        </g>
      ) : (
        <g>
          <circle cx="292" cy="78" r="28" fill="#f0b429" />
          <circle cx="292" cy="78" r="40" fill="#f0b429" opacity="0.25" />
          <ellipse cx="78" cy="92" rx="36" ry="14" fill="#fff" opacity="0.7" />
          <ellipse cx="108" cy="88" rx="24" ry="12" fill="#fff" opacity="0.55" />
        </g>
      )}
      <path d="M0 360 C 70 330, 120 348, 180 336 C 250 322, 300 350, 360 328 L 360 520 L 0 520 Z" fill="url(#ground)" />
      <path d="M48 392 C 90 370, 140 388, 168 376" fill="none" stroke={night ? "#2a4a38" : "#d7e7b8"} strokeWidth="8" strokeLinecap="round" />
      <g transform="translate(86 214)">
        <path d="M92 78 L92 168 L188 168 L188 78 Z" fill={night ? "#24362e" : "#f3e6d2"} />
        <path d="M78 84 L140 28 L202 84 Z" fill={night ? "#1a2822" : "#3e4b44"} />
        <path d="M104 70 L150 34 L196 70 Z" fill="url(#panel)" stroke={night ? "#d6f25c" : "#d6f25c"} strokeOpacity="0.7" />
        {[0, 1, 2].map((row) => (
          <line key={row} x1="112" y1={48 + row * 8} x2="186" y2={58 + row * 6} stroke="#d6f25c" strokeOpacity={night ? 0.35 : 0.55} />
        ))}
        <rect x="128" y="118" width="26" height="50" rx="2" fill={night ? "#c9853a" : "#8d5a3c"} />
        {[
          [104, 100],
          [162, 100],
          [104, 132],
          [162, 132],
        ].map(([x, y], index) => (
          <rect key={index} x={x} y={y} width="22" height="16" rx="1.5" fill={night ? "#f0b429" : "#fff8ea"} opacity={night ? 0.9 : 1} />
        ))}
        <rect x="168" y="58" width="8" height="22" fill={night ? "#2a2118" : "#6d5848"} />
      </g>
      <g transform="translate(46 300)">
        <path d="M18 70 C 18 40, 46 28, 46 70 Z" fill={night ? "#163026" : "#2f6b45"} />
        <rect x="42" y="46" width="6" height="48" fill={night ? "#3a2a1c" : "#6b4a32"} />
      </g>
      {night ? <rect width="360" height="520" fill="#06110e" opacity="0.18" /> : null}
    </svg>
  );
}
