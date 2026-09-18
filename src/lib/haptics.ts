// Native-feel haptic feedback. Uses the Capacitor Haptics plugin on native
// iOS/Android, and falls back to the Web Vibration API in the browser.
// No-ops on devices without support.
import { Capacitor } from "@capacitor/core";

type HapticKind = "light" | "medium" | "heavy" | "success" | "error" | "selection";

const PATTERNS: Record<HapticKind, number | number[]> = {
  light: 8,
  medium: 14,
  heavy: 24,
  selection: 5,
  success: [10, 30, 18],
  error: [22, 40, 22, 40, 22],
};

const isNative = Capacitor.isNativePlatform();

function nativeHaptic(kind: HapticKind) {
  import("@capacitor/haptics")
    .then(({ Haptics, ImpactStyle, NotificationType }) => {
      switch (kind) {
        case "light":
          return Haptics.impact({ style: ImpactStyle.Light });
        case "medium":
          return Haptics.impact({ style: ImpactStyle.Medium });
        case "heavy":
          return Haptics.impact({ style: ImpactStyle.Heavy });
        case "selection":
          return Haptics.selectionStart().then(() => Haptics.selectionEnd());
        case "success":
          return Haptics.notification({ type: NotificationType.Success });
        case "error":
          return Haptics.notification({ type: NotificationType.Error });
      }
    })
    .catch(() => { /* plugin unavailable */ });
}

export function haptic(kind: HapticKind = "light") {
  try {
    if (isNative) {
      nativeHaptic(kind);
      return;
    }
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
