export function Mark({ className = "size-12" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <rect width="64" height="64" rx="18" fill="#173028" />
      <circle cx="40" cy="20" r="8" fill="#f0b429" />
      <path d="M14 36 L32 20 L50 36" fill="none" stroke="#d6f25c" strokeWidth="3" strokeLinejoin="round" />
      <path d="M20 36 V48 H44 V36" fill="none" stroke="#e8f2ec" strokeWidth="3" />
      <path d="M24 30 L32 23 L40 30" fill="#1f4d3d" stroke="#d6f25c" strokeWidth="1.4" />
    </svg>
  );
}
