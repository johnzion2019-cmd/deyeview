import { useRef, useState, type ReactNode, type TouchEvent } from "react";

export function PullToRefresh({ onRefresh, children }: { onRefresh: () => Promise<void>; children: ReactNode }) {
  const scroller = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const pulling = useRef(false);
  const [pull, setPull] = useState(0);
  const [busy, setBusy] = useState(false);

  function onTouchStart(event: TouchEvent<HTMLDivElement>) {
    if ((scroller.current?.scrollTop ?? 0) <= 0) {
      startY.current = event.touches[0]?.clientY ?? 0;
      pulling.current = true;
    }
  }

  function onTouchMove(event: TouchEvent<HTMLDivElement>) {
    if (!pulling.current || busy) return;
    const dy = (event.touches[0]?.clientY ?? 0) - startY.current;
    if (dy > 0 && (scroller.current?.scrollTop ?? 0) <= 0) setPull(Math.min(88, dy * 0.42));
    else setPull(0);
  }

  async function onTouchEnd() {
    const should = pull > 62;
    pulling.current = false;
    setPull(0);
    if (!should || busy) return;
    setBusy(true);
    try {
      await onRefresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      ref={scroller}
      className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={() => void onTouchEnd()}
    >
      <div className="flex items-end justify-center overflow-hidden text-[11px] tracking-wide text-muted" style={{ height: busy ? 28 : pull }}>
        {busy ? "Refreshing" : pull > 62 ? "Release to refresh" : pull > 12 ? "Pull to refresh" : ""}
      </div>
      {children}
    </div>
  );
}
