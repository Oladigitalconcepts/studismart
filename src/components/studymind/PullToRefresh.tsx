import { ReactNode, useEffect, useRef, useState, useCallback } from "react";
import { Loader2, ArrowDown, Check } from "lucide-react";
import { toast } from "sonner";

interface Props {
  onRefresh: () => Promise<void> | void;
  children: ReactNode;
  /** Distance (px) the user must drag past the threshold to trigger refresh. */
  threshold?: number;
  /** Disable pull behaviour (e.g. during route transitions). */
  disabled?: boolean;
  /** Show a small toast on successful refresh. */
  silent?: boolean;
  /** Auto-refresh when the tab regains visibility after this many ms. */
  autoRefreshMs?: number;
  className?: string;
}

/**
 * Lightweight, native-feeling pull-to-refresh wrapper for mobile screens.
 * - Only activates when the inner scroll container is at scrollTop = 0.
 * - Prevents duplicate refreshes via an `isRefreshing` ref.
 * - Auto-refreshes when the tab becomes visible again after `autoRefreshMs`.
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
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef<number | null>(null);
  const pulling = useRef(false);
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
      if (!silent) toast.success("Updated", { duration: 1200 });
      setTimeout(() => setSuccess(false), 900);
    } catch (e: any) {
      toast.error(e?.message ?? "Refresh failed");
    } finally {
      refreshingRef.current = false;
      setRefreshing(false);
      setPullDistance(0);
    }
  }, [onRefresh, silent]);

  // Auto-refresh on visibility change after inactivity.
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

  const onTouchStart = (e: React.TouchEvent) => {
    if (disabled || refreshingRef.current) return;
    const el = containerRef.current;
    if (!el || el.scrollTop > 0) return;
    startY.current = e.touches[0].clientY;
    pulling.current = true;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (!pulling.current || startY.current == null) return;
    const dy = e.touches[0].clientY - startY.current;
    if (dy <= 0) {
      setPullDistance(0);
      return;
    }
    // Resistance curve.
    const eased = Math.min(120, Math.pow(dy, 0.85));
    setPullDistance(eased);
  };

  const onTouchEnd = () => {
    if (!pulling.current) return;
    pulling.current = false;
    startY.current = null;
    if (pullDistance >= threshold) {
      triggerRefresh();
    } else {
      setPullDistance(0);
    }
  };

  const indicatorOpacity = Math.min(1, pullDistance / threshold);
  const ready = pullDistance >= threshold;

  return (
    <div
      ref={containerRef}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      className={`relative h-full overflow-y-auto overscroll-y-contain ${className}`}
      style={{ WebkitOverflowScrolling: "touch" }}
    >
      {/* Indicator */}
      <div
        className="pointer-events-none absolute left-0 right-0 top-0 flex justify-center transition-transform"
        style={{
          transform: `translateY(${refreshing ? 16 : Math.max(0, pullDistance - 30)}px)`,
          opacity: refreshing ? 1 : indicatorOpacity,
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

      {/* Content (translates down with the pull) */}
      <div
        style={{
          transform: `translateY(${refreshing ? 40 : pullDistance * 0.5}px)`,
          transition: pulling.current ? "none" : "transform 250ms ease",
        }}
      >
        {children}
      </div>
    </div>
  );
};
