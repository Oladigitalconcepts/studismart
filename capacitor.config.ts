import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.studismart.studymind",
  appName: "StudyMind AI",
  // Vite builds to `dist` by default — this is what gets bundled into the native app.
  webDir: "dist",
  backgroundColor: "#0F0B1F",
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      launchAutoHide: true,
      backgroundColor: "#0F0B1F",
      androidSplashResourceName: "splash",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    Keyboard: {
      resizeOnFullScreen: true,
    },
  },
  ios: {
    contentInset: "always",
    backgroundColor: "#0F0B1F",
  },
  android: {
    backgroundColor: "#0F0B1F",
  },
};

export default config;
