import { ReactNode, useEffect, useRef, useState, useCallback } from "react";
import { Loader2, ArrowDown, Check } from "lucide-react";
import { toast } from "sonner";

interface Props {
  onRefresh: () => Promise<void> | void;
  children: ReactNode;
  threshold?: number;
  disabled?: boolean;
  silent?: boolean;
  /** Auto-refresh when the tab regains visibility after this many ms of inactivity. */
  autoRefreshMs?: number;
  className?: string;
}

/**
 * Native-feeling pull-to-refresh that works with document scroll.
 * - Activates only when window.scrollY === 0.
 * - Prevents duplicate refreshes via a ref guard.
 * - Auto-refreshes on tab visibility/focus after `autoRefreshMs`.
 */
export const PullToRefresh = ({
  onRefresh,
  children,
  threshold = 70,
  disabled = false,
  silent = false,
  autoRefreshMs = 60_000,
  className = "",
}: Props) => {
  const startY = useRef<number | null>(null);
  const pullingRef = useRef(false);
  const refreshingRef = useRef(false);
  const lastRefreshAt = useRef<number>(Date.now());

  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [success, setSuccess] = useState(false);

  const triggerRefresh = useCallback(async () => {
    if (refreshingRef.current) return;
    refreshingRef.current = true;
    setRefreshing(true);
    try {
      await onRefresh();
      lastRefreshAt.current = Date.now();
      setSuccess(true);
      if (!silent) toast.success("Updated", { duration: 1100 });
      setTimeout(() => setSuccess(false), 900);
    } catch (e: any) {
      toast.error(e?.message ?? "Refresh failed");
    } finally {
      refreshingRef.current = false;
      setRefreshing(false);
      setPullDistance(0);
    }
  }, [onRefresh, silent]);

  // Auto-refresh on visibility/focus after inactivity.
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState !== "visible") return;
      if (Date.now() - lastRefreshAt.current < autoRefreshMs) return;
      triggerRefresh();
    };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", onVis);
    };
  }, [triggerRefresh, autoRefreshMs]);

  // Touch handlers attached to window so they catch pulls anywhere on screen.
  useEffect(() => {
    if (disabled) return;
    const findScrollableAncestor = (node: EventTarget | null): HTMLElement | null => {
      let el = node as HTMLElement | null;
      while (el && el !== document.body && el !== document.documentElement) {
        const s = getComputedStyle(el);
        const oy = s.overflowY;
        if ((oy === "auto" || oy === "scroll" || oy === "overlay") && el.scrollHeight > el.clientHeight) {
          return el;
        }
        el = el.parentElement;
      }
      return null;
    };
    const onStart = (e: TouchEvent) => {
      if (refreshingRef.current) return;
      if (window.scrollY > 0) return;
      // If the touch is inside an inner scroll container that's not at the top,
      // let it scroll normally — don't hijack as pull-to-refresh.
      const inner = findScrollableAncestor(e.target);
      if (inner && inner.scrollTop > 0) return;
      startY.current = e.touches[0].clientY;
      pullingRef.current = true;
    };
    const onMove = (e: TouchEvent) => {
      if (!pullingRef.current || startY.current == null) return;
      const dy = e.touches[0].clientY - startY.current;
      if (dy <= 0) {
        if (pullDistance !== 0) setPullDistance(0);
        return;
      }
      // Prevent rubber-banding interference once we own the gesture.
      if (dy > 8 && e.cancelable) e.preventDefault();
      const eased = Math.min(120, Math.pow(dy, 0.85));
      setPullDistance(eased);
    };
    const onEnd = () => {
      if (!pullingRef.current) return;
      pullingRef.current = false;
      startY.current = null;
      setPullDistance((d) => {
        if (d >= threshold) triggerRefresh();
        return d >= threshold ? d : 0;
      });
    };
    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onEnd);
    window.addEventListener("touchcancel", onEnd);
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
      window.removeEventListener("touchcancel", onEnd);
    };
  }, [disabled, threshold, triggerRefresh, pullDistance]);

  const indicatorOpacity = Math.min(1, pullDistance / threshold);
  const ready = pullDistance >= threshold;
  const indicatorTop = refreshing ? 24 : Math.max(0, pullDistance - 30);

  return (
    <div className={`relative ${className}`}>
      <div
        className="pointer-events-none fixed left-0 right-0 z-50 flex justify-center"
        style={{
          top: `calc(env(safe-area-inset-top) + ${indicatorTop}px)`,
          opacity: refreshing ? 1 : indicatorOpacity,
          transition: pullingRef.current ? "none" : "opacity 200ms ease, top 250ms ease",
        }}
      >
        <div className="h-9 w-9 rounded-full bg-white shadow-md border border-slate-200 flex items-center justify-center">
          {success ? (
            <Check className="h-4 w-4 text-emerald-600" />
          ) : refreshing ? (
            <Loader2 className="h-4 w-4 text-violet-600 animate-spin" />
          ) : (
            <ArrowDown
              className={`h-4 w-4 transition-transform duration-200 ${
                ready ? "rotate-180 text-violet-600" : "text-slate-400"
              }`}
            />
          )}
        </div>
      </div>

      {children}
    </div>
  );
};
