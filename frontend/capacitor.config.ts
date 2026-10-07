import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Application Android AlloDoc (APK) : enveloppe native de la même application React.
 * Construire : npm run build:android puis, dans android/, gradlew assembleRelease (voir README).
 * L'API doit être joignable depuis le téléphone : définir VITE_API_URL (URL HTTPS publique) avant le build.
 */
const config: CapacitorConfig = {
  appId: "africa.allodoc.app",
  appName: "AlloDoc",
  webDir: "dist",
  android: {
    // Pas de contenu HTTP non chiffré dans l'application publiée.
    allowMixedContent: false,
  },
  server: {
    androidScheme: "https",
  },
};

export default config;
