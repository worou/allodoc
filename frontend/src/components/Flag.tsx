import type { CountryCode } from "../lib/types";

/** Drapeaux en SVG : les emojis drapeaux ne s'affichent pas sous Windows ni sur beaucoup d'Android d'entrée de gamme. */
export function Flag({ code, width = 28 }: { code: CountryCode; width?: number }) {
  const height = Math.round((width * 2) / 3);
  const common = { width, height, viewBox: "0 0 30 20", className: "flag", role: "img" as const };

  if (code === "ML") {
    return (
      <svg {...common} aria-label="Drapeau du Mali">
        <rect width="10" height="20" fill="#14B53A" />
        <rect x="10" width="10" height="20" fill="#FCD116" />
        <rect x="20" width="10" height="20" fill="#CE1126" />
      </svg>
    );
  }
  if (code === "BF") {
    return (
      <svg {...common} aria-label="Drapeau du Burkina Faso">
        <rect width="30" height="10" fill="#EF2B2D" />
        <rect y="10" width="30" height="10" fill="#009E49" />
        <path fill="#FCD116" d="M15 6.2l.94 2.9h3.05l-2.47 1.8.94 2.9L15 12l-2.46 1.8.94-2.9-2.47-1.8h3.05z" />
      </svg>
    );
  }
  return (
    <svg {...common} aria-label="Drapeau du Niger">
      <rect width="30" height="6.67" fill="#E05206" />
      <rect y="6.67" width="30" height="6.67" fill="#FFFFFF" />
      <rect y="13.33" width="30" height="6.67" fill="#0DB02B" />
      <circle cx="15" cy="10" r="2.3" fill="#E05206" />
    </svg>
  );
}

export const FLAG_STRIPES: Record<CountryCode, string> = {
  ML: "linear-gradient(90deg,#14B53A 33.3%,#FCD116 33.3% 66.6%,#CE1126 66.6%)",
  BF: "linear-gradient(180deg,#EF2B2D 50%,#009E49 50%)",
  NE: "linear-gradient(180deg,#E05206 33.3%,#fff 33.3% 66.6%,#0DB02B 66.6%)",
};
