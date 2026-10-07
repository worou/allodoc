import { Capacitor } from "@capacitor/core";
import { useEffect, useState } from "react";

/**
 * Installation de l'application (PWA) : le navigateur émet "beforeinstallprompt" une seule fois, souvent avant
 * l'affichage de la page de téléchargement. On le capture dès le démarrage (initInstallCapture, appelé dans
 * main.tsx) pour pouvoir proposer un vrai bouton "Installer" plus tard.
 */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let deferred: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

export function initInstallCapture() {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e as BeforeInstallPromptEvent;
    notify();
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    try {
      localStorage.setItem("allodoc.installed", "1");
    } catch {
      /* ignoré */
    }
    notify();
  });
}

export type Platform = "android" | "ios" | "desktop";

export function detectPlatform(): Platform {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "desktop";
}

/** Application Android native (APK construit avec Capacitor). */
export function isNativeApp() {
  return Capacitor.isNativePlatform();
}

/** L'application tourne-t-elle déjà en mode installé (icône sur l'écran d'accueil ou APK) ? */
export function isStandalone() {
  return isNativeApp() || window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

/** Lien direct vers un APK Android, si un fichier a été publié (voir README, section application mobile). */
export const APK_URL: string | undefined = import.meta.env.VITE_ANDROID_APK_URL || undefined;

export function useInstall() {
  const [, force] = useState(0);
  useEffect(() => {
    const l = () => force((n) => n + 1);
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, []);

  let installedBefore = false;
  try {
    installedBefore = localStorage.getItem("allodoc.installed") === "1";
  } catch {
    installedBefore = false;
  }

  return {
    platform: detectPlatform(),
    standalone: isStandalone(),
    canPrompt: deferred !== null,
    installedBefore,
    async install(): Promise<boolean> {
      if (!deferred) return false;
      const event = deferred;
      await event.prompt();
      const { outcome } = await event.userChoice;
      deferred = null;
      notify();
      return outcome === "accepted";
    },
  };
}
