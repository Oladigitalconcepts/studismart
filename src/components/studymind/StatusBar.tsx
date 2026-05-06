import { useEffect } from "react";

/**
 * StatusBar
 * - Synchronizes the browser/OS status bar tint (theme-color meta) with the
 *   current screen so iOS/Android notches blend with the UI.
 * - Does NOT render extra spacing — top safe-area padding is handled by
 *   `.screen-shell` (env(safe-area-inset-top)) so we never double-pad.
 *
 * Usage: drop `<StatusBar />` at the top of a screen. Pass `tone="primary"`
 * (or a custom `color`) when the screen has a colored/gradient header.
 */
type Tone = "background" | "card" | "primary" | "hero" | "night";

interface Props {
  /** Semantic tone of the top of the screen. Defaults to "background". */
  tone?: Tone;
  /** Optional explicit hex color override (wins over tone). */
  color?: string;
}

const TONE_LIGHT: Record<Tone, string> = {
  background: "#FCFBFF",
  card: "#FFFFFF",
  primary: "#7C5CFF",
  hero: "#7C5CFF",
  night: "#1A1330",
};

const TONE_DARK: Record<Tone, string> = {
  background: "#0F0B1F",
  card: "#161226",
  primary: "#9A7BFF",
  hero: "#3B2A7A",
  night: "#0F0B1F",
};

const setMetaThemeColor = (color: string) => {
  // Remove media-scoped variants so our explicit color always wins.
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.remove());
  const meta = document.createElement("meta");
  meta.name = "theme-color";
  meta.content = color;
  document.head.appendChild(meta);
};

export const StatusBar = ({ tone = "background", color }: Props) => {
  useEffect(() => {
    const apply = () => {
      const isDark = document.documentElement.classList.contains("dark");
      const next = color ?? (isDark ? TONE_DARK[tone] : TONE_LIGHT[tone]);
      setMetaThemeColor(next);
    };
    apply();
    const obs = new MutationObserver(apply);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, [tone, color]);

  return null;
};
