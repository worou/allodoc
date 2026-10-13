import { translate } from "./i18n";
import type { SubregionCode } from "./types";

/** Les cinq sous-régions, dans l'ordre d'affichage, avec leur URL publique (/afrique/ouest...) et leur couleur. */
export const SUBREGIONS: { code: SubregionCode; slug: string; color: string }[] = [
  { code: "north", slug: "nord", color: "var(--sub-north)" },
  { code: "west", slug: "ouest", color: "var(--sub-west)" },
  { code: "central", slug: "centre", color: "var(--sub-central)" },
  { code: "east", slug: "est", color: "var(--sub-east)" },
  { code: "southern", slug: "australe", color: "var(--sub-southern)" },
];

export function subregionName(code: SubregionCode) {
  return translate(`subregion.${code}`);
}

export function subregionPath(code: SubregionCode) {
  return `/afrique/${SUBREGIONS.find((s) => s.code === code)?.slug ?? ""}`;
}

export function subregionFromSlug(slug: string | undefined): SubregionCode | null {
  return SUBREGIONS.find((s) => s.slug === slug)?.code ?? null;
}

export function subregionColor(code: SubregionCode) {
  return SUBREGIONS.find((s) => s.code === code)?.color ?? "var(--terracotta)";
}
