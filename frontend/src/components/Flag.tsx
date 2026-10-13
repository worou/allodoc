import { countryName } from "../lib/api";
import { useI18n } from "../lib/i18n";
import type { CountryCode } from "../lib/types";

/**
 * Drapeaux en SVG (country-flag-icons) : les emojis drapeaux ne s'affichent pas sous Windows ni sur beaucoup
 * d'Android d'entrée de gamme. Chaque drapeau est un petit fichier séparé, chargé seulement s'il est affiché.
 */
const FLAGS = import.meta.glob<string>("/node_modules/country-flag-icons/3x2/*.svg", { query: "?no-inline", import: "default", eager: true });

function flagUrl(code: CountryCode) {
  return FLAGS[`/node_modules/country-flag-icons/3x2/${code.toUpperCase()}.svg`];
}

export function Flag({ code, width = 28 }: { code: CountryCode; width?: number }) {
  const { t } = useI18n();
  const height = Math.round((width * 2) / 3);
  const url = flagUrl(code);
  const label = t("flag.label", { country: countryName(code) });
  if (!url) return <span className="flag flag-empty" style={{ width, height }} role="img" aria-label={label} />;
  return <img className="flag" src={url} width={width} height={height} alt={label} loading="lazy" decoding="async" />;
}

/** Bandeau aux couleurs du drapeau (haut de la page pays). */
export function FlagBand({ code }: { code: CountryCode }) {
  const url = flagUrl(code);
  return <div className="flag-band" style={url ? { backgroundImage: `url(${url})` } : undefined} aria-hidden="true" />;
}
