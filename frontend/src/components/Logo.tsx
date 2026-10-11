import { Link } from "react-router";
import { useI18n } from "../lib/i18n";

/** Marque AlloDoc : une croix de soin posée sur un soleil sahélien, entourée d'un motif tissé. */
export function LogoMark({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" className="brand-mark" aria-hidden="true">
      <circle cx="20" cy="20" r="19" fill="#E3A21A" />
      <circle cx="20" cy="20" r="19" fill="none" stroke="#C2502A" strokeWidth="2" strokeDasharray="3 3" />
      <rect x="15.5" y="9" width="9" height="22" rx="2.5" fill="#1C1F57" />
      <rect x="9" y="15.5" width="22" height="9" rx="2.5" fill="#1C1F57" />
      <path d="M17.5 20h5M20 17.5v5" stroke="#E3A21A" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function Logo() {
  const { t } = useI18n();
  return (
    <Link to="/" className="brand" aria-label={t("header.homeLabel")}>
      <LogoMark />
      <span>
        Allo<b>Doc</b>
      </span>
    </Link>
  );
}

/** Soleil décoratif du héros, rayons en pointes comme les motifs adinkra. */
export function HeroSun() {
  const rays = Array.from({ length: 16 }, (_, i) => i * 22.5);
  return (
    <svg viewBox="0 0 200 200" className="hero-sun" aria-hidden="true">
      <g fill="#E3A21A">
        {rays.map((deg) => (
          <path key={deg} d="M100 8l7 30h-14z" transform={`rotate(${deg} 100 100)`} />
        ))}
      </g>
      <circle cx="100" cy="100" r="52" fill="none" stroke="#E3A21A" strokeWidth="6" />
      <circle cx="100" cy="100" r="34" fill="#E3A21A" />
    </svg>
  );
}
