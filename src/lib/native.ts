// Central place for Capacitor native platform setup.
// Everything here is a safe no-op on the web, so the same build runs
// unchanged in the browser and inside the native iOS/Android shells.
import { Capacitor } from "@capacitor/core";

export const isNative = Capacitor.isNativePlatform();
export const nativePlatform = Capacitor.getPlatform(); // "ios" | "android" | "web"

/**
 * Initialize native-only behaviors: status bar styling, splash screen,
 * keyboard resize handling, and Android hardware back button.
 * Called once at app boot. Dynamically imports plugins so the web bundle
 * never pulls in native-only code paths unnecessarily.
 */
export async function initNative() {
  if (!isNative) return;

  try {
    const { StatusBar, Style } = await import("@capacitor/status-bar");
    const isDark = document.documentElement.classList.contains("dark");
    await StatusBar.setStyle({ style: isDark ? Style.Dark : Style.Light });
    if (nativePlatform === "android") {
      await StatusBar.setBackgroundColor({ color: isDark ? "#0F0B1F" : "#7C5CFF" });
    }

    // Keep the native status bar in sync when the theme toggles.
    const observer = new MutationObserver(async () => {
      const dark = document.documentElement.classList.contains("dark");
      await StatusBar.setStyle({ style: dark ? Style.Dark : Style.Light });
      if (nativePlatform === "android") {
        await StatusBar.setBackgroundColor({ color: dark ? "#0F0B1F" : "#7C5CFF" });
      }
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  } catch { /* status bar plugin unavailable */ }

  try {
    const { SplashScreen } = await import("@capacitor/splash-screen");
    await SplashScreen.hide();
  } catch { /* splash plugin unavailable */ }

  try {
    const { App } = await import("@capacitor/app");
    // Android hardware back button: go back in history, or minimize at the root.
    App.addListener("backButton", ({ canGoBack }) => {
      if (canGoBack) {
        window.history.back();
      } else {
        App.exitApp();
      }
    });
  } catch { /* app plugin unavailable */ }

  try {
    const { Keyboard } = await import("@capacitor/keyboard");
    // Add a class while the keyboard is open so layouts can adapt if needed.
    Keyboard.addListener("keyboardWillShow", () => {
      document.documentElement.classList.add("keyboard-open");
    });
    Keyboard.addListener("keyboardWillHide", () => {
      document.documentElement.classList.remove("keyboard-open");
    });
  } catch { /* keyboard plugin unavailable */ }
}
