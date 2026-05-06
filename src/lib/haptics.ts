// Native-feel haptic feedback. No-ops on devices without vibration support.
type HapticKind = "light" | "medium" | "heavy" | "success" | "error" | "selection";

const PATTERNS: Record<HapticKind, number | number[]> = {
  light: 8,
  medium: 14,
  heavy: 24,
  selection: 5,
  success: [10, 30, 18],
  error: [22, 40, 22, 40, 22],
};

export function haptic(kind: HapticKind = "light") {
  try {
    if (typeof navigator === "undefined" || !("vibrate" in navigator)) return;
    navigator.vibrate(PATTERNS[kind] ?? 8);
  } catch { /* noop */ }
}

// Auto-attach light haptic to every tap (mobile only). Call once at app boot.
let installed = false;
export function installGlobalTapHaptics() {
  if (installed || typeof window === "undefined") return;
  installed = true;
  const isCoarse = window.matchMedia?.("(pointer: coarse)").matches;
  if (!isCoarse) return;
  window.addEventListener("pointerdown", (e) => {
    const target = e.target as HTMLElement | null;
    if (!target) return;
    const tappable = target.closest("button, a, [role='button'], [data-haptic]");
    if (!tappable) return;
    if ((tappable as HTMLButtonElement).disabled) return;
    haptic("light");
  }, { passive: true });
}
