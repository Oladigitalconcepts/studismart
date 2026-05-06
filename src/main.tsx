import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { installGlobalTapHaptics } from "./lib/haptics";

installGlobalTapHaptics();


// Initialize theme (light by default) + sync browser chrome color
const savedTheme = localStorage.getItem("studymind-theme");
const isDark = savedTheme === "dark";
document.documentElement.classList.toggle("dark", isDark);

const setThemeColor = (dark: boolean) => {
  const color = dark ? "#0F0B1F" : "#7C5CFF";
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.remove());
  const meta = document.createElement("meta");
  meta.name = "theme-color";
  meta.content = color;
  document.head.appendChild(meta);
};
setThemeColor(isDark);

// Keep the meta tag in sync when other code toggles the .dark class
const observer = new MutationObserver(() => {
  setThemeColor(document.documentElement.classList.contains("dark"));
});
observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

createRoot(document.getElementById("root")!).render(<App />);
