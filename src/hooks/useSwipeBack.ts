import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";

/**
 * iOS-style edge swipe-back gesture.
 * - Activates only when the touch starts within ~24px of the left edge.
 * - Requires a horizontal swipe of >70px and mostly horizontal motion.
 * - Calls history.back() on release; Android system back already works natively.
 */
export function useSwipeBack(enabled = true) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const start = useRef<{ x: number; y: number; t: number } | null>(null);

  useEffect(() => {
    if (!enabled) return;
    if (pathname === "/" || pathname === "/home") return; // nothing to go back to

    const onStart = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!t) return;
      if (t.clientX > 28) { start.current = null; return; }
      start.current = { x: t.clientX, y: t.clientY, t: Date.now() };
    };
    const onEnd = (e: TouchEvent) => {
      if (!start.current) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - start.current.x;
      const dy = Math.abs(t.clientY - start.current.y);
      const dt = Date.now() - start.current.t;
      start.current = null;
      if (dx > 70 && dy < 60 && dt < 600) {
        // history back if possible, otherwise go home
        if (window.history.length > 1) window.history.back();
        else navigate("/home");
      }
    };

    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchend", onEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchend", onEnd);
    };
  }, [enabled, pathname, navigate]);
}
