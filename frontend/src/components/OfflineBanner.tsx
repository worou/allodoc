import { useEffect, useState } from "react";
import { useI18n } from "../lib/i18n";
import { isNativeApp } from "../lib/install";

/** Bandeau hors ligne + enregistrement du service worker (cache des pages et listes déjà consultées). */
export function OfflineBanner() {
  const { t } = useI18n();
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    // Pas de service worker dans l'APK : les fichiers de l'application sont déjà sur le téléphone.
    if ("serviceWorker" in navigator && import.meta.env.PROD && !isNativeApp()) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  if (!offline) return null;
  return (
    <div className="offline-banner" role="status">
      {t("offline.banner")}
    </div>
  );
}
