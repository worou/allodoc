import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { initInstallCapture } from "./lib/install";
import "./index.css";

// Capturé avant le premier rendu : le navigateur ne propose l'installation qu'une fois.
initInstallCapture();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
