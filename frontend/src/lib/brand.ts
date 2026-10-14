/**
 * Nom de la marque, propre à chaque site construit à partir de ce code : AlloDoc (allodoc.teranga.re, par défaut)
 * ou AfroDoc (afrodoc.teranga.re). Fixé au build par VITE_BRAND_NAME (voir deploy/build.sh).
 */
export const BRAND_NAME: string = import.meta.env.VITE_BRAND_NAME || "AlloDoc";

/** Première partie du logo ("Allo", "Afro") : la seconde, "Doc", est mise en couleur. */
export const BRAND_PREFIX = BRAND_NAME.replace(/Doc$/, "");
