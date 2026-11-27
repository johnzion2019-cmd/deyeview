import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/outfit/latin-400.css";
import "@fontsource/outfit/latin-500.css";
import "@fontsource/outfit/latin-600.css";
import "@fontsource/fraunces/latin-500.css";
import "@fontsource/fraunces/latin-600.css";
import { bootNativeChrome } from "@/platform/native";
import { App } from "@/App";
import "./index.css";

void bootNativeChrome();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
