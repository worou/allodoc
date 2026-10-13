import { useState } from "react";
import { useNavigate } from "react-router";
import map from "../assets/africa-map.json";
import { subregionColor } from "../lib/africa";
import { countryName, countryPath } from "../lib/api";
import { useI18n } from "../lib/i18n";
import type { CountryCode, SubregionCode } from "../lib/types";

const PATHS = map.paths as Record<string, string>;
const MARKERS = map.markers as Record<string, number[]>;

interface Props {
  /** Sous-région de chaque pays (code ISO => sous-région). */
  subregions: Record<CountryCode, SubregionCode>;
  /** Sous-région mise en avant ; les autres pays sont estompés. null : tout le continent. */
  selected?: SubregionCode | null;
  /** Nombre de praticiens par pays, affiché au survol. */
  counts?: Record<CountryCode, number>;
  /** Survol d'un pays (synchronise la liste à côté de la carte). */
  onHover?: (code: CountryCode | null) => void;
  highlighted?: CountryCode | null;
  /** Choix d'une sous-région en cliquant un pays d'une autre sous-région (sinon : page du pays). */
  onPickSubregion?: (code: SubregionCode) => void;
  className?: string;
}

/**
 * Carte de l'Afrique (Natural Earth, 1:50m) : chaque pays, coloré selon sa sous-région, mène à sa page.
 * Utilisable au clavier (Tab puis Entrée) ; les petits États insulaires ont un repère pour rester cliquables.
 */
export default function AfricaMap({ subregions, selected = null, counts, onHover, highlighted, onPickSubregion, className }: Props) {
  const navigate = useNavigate();
  const { t, tn } = useI18n();
  const [hover, setHover] = useState<CountryCode | null>(null);
  const active = highlighted ?? hover;

  function open(code: CountryCode) {
    const sub = subregions[code];
    if (onPickSubregion && sub && selected && sub !== selected) onPickSubregion(sub);
    else navigate(countryPath(code));
  }

  function enter(code: CountryCode | null) {
    setHover(code);
    onHover?.(code);
  }

  const label = (code: CountryCode) =>
    counts && code in counts ? `${countryName(code)} · ${tn("country.practitioners", counts[code] ?? 0)}` : countryName(code);

  return (
    <figure className={`africa-map ${className ?? ""}`}>
      <svg viewBox={`0 0 ${map.width} ${map.height}`} role="group" aria-label={t("africa.mapLabel")}>
        {Object.entries(PATHS).map(([code, d]) => {
          const sub = subregions[code];
          const dim = selected !== null && sub !== selected;
          return (
            <path
              key={code}
              d={d}
              className={`map-country${dim ? " dim" : ""}${active === code ? " active" : ""}`}
              style={{ fill: sub ? subregionColor(sub) : undefined }}
              tabIndex={dim ? -1 : 0}
              role="link"
              aria-label={label(code)}
              onMouseEnter={() => enter(code)}
              onMouseLeave={() => enter(null)}
              onFocus={() => enter(code)}
              onBlur={() => enter(null)}
              onClick={() => open(code)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  open(code);
                }
              }}
            >
              <title>{label(code)}</title>
            </path>
          );
        })}
        {Object.entries(MARKERS).map(([code, [x, y]]) => {
          const sub = subregions[code];
          const dim = selected !== null && sub !== selected;
          return (
            <circle
              key={code}
              cx={x}
              cy={y}
              r={9}
              className={`map-island${dim ? " dim" : ""}${active === code ? " active" : ""}`}
              style={{ stroke: sub ? subregionColor(sub) : undefined }}
              aria-hidden="true"
              onMouseEnter={() => enter(code)}
              onMouseLeave={() => enter(null)}
              onClick={() => open(code)}
            />
          );
        })}
      </svg>
      <figcaption className="map-caption" aria-live="polite">
        {active ? label(active) : t("africa.mapHint")}
      </figcaption>
    </figure>
  );
}
