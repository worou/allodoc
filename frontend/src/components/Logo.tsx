import { Link } from "react-router";
import { useI18n } from "../lib/i18n";
import { BRAND_PREFIX } from "../lib/brand";

/** Marque AlloDoc : une croix de soin posée sur un soleil africain, entourée d'un motif tissé (couleurs panafricaines). */
export function LogoMark({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" className="brand-mark" aria-hidden="true">
      <circle cx="20" cy="20" r="19" fill="#F0B429" />
      <circle cx="20" cy="20" r="19" fill="none" stroke="#C23B20" strokeWidth="2" strokeDasharray="3 3" />
      <rect x="15.5" y="9" width="9" height="22" rx="2.5" fill="#113526" />
      <rect x="9" y="15.5" width="22" height="9" rx="2.5" fill="#113526" />
      <path d="M17.5 20h5M20 17.5v5" stroke="#F0B429" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function Logo() {
  const { t } = useI18n();
  return (
    <Link to="/" className="brand" aria-label={t("header.homeLabel")}>
      <LogoMark />
      <span>
        {BRAND_PREFIX}
        <b>Doc</b>
      </span>
    </Link>
  );
}

/** Soleil décoratif du héros, rayons en pointes comme les motifs adinkra. */
export function HeroSun() {
  const rays = Array.from({ length: 16 }, (_, i) => i * 22.5);
  return (
    <svg viewBox="0 0 200 200" className="hero-sun" aria-hidden="true">
      <g fill="#F0B429">
        {rays.map((deg) => (
          <path key={deg} d="M100 8l7 30h-14z" transform={`rotate(${deg} 100 100)`} />
        ))}
      </g>
      <circle cx="100" cy="100" r="52" fill="none" stroke="#F0B429" strokeWidth="6" />
      <circle cx="100" cy="100" r="34" fill="#F0B429" />
    </svg>
  );
}
