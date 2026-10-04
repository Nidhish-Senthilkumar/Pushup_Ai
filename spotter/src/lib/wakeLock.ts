import { useEffect } from "react";

/**
 * Keeps the screen on while a round runs. A phone lying on the floor would
 * otherwise dim and lock halfway through a two-minute round.
 */
export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || !("wakeLock" in navigator)) return;
    let sentinel: WakeLockSentinel | null = null;
    let cancelled = false;
    const acquire = () => {
      navigator.wakeLock
        .request("screen")
        .then((s) => {
          if (cancelled) void s.release();
          else sentinel = s;
        })
        .catch(() => {
          // Refused (battery saver, unfocused tab). The round still works.
        });
    };
    acquire();
    // The lock is dropped whenever the tab is hidden; take it back on return.
    const onVisible = () => {
      if (document.visibilityState === "visible") acquire();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      void sentinel?.release();
    };
  }, [active]);
}
