import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Initialize theme (light by default)
const savedTheme = localStorage.getItem("studymind-theme");
document.documentElement.classList.toggle("dark", savedTheme === "dark");

createRoot(document.getElementById("root")!).render(<App />);
