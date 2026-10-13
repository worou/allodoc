import { getLang, intlLocale, translate, translateOr } from "./i18n";
import type { CountryCode } from "./types";

export const API_URL = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000";

export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const TOKEN_KEY = "allodoc.token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string | null) {
  try {
    if (token) window.localStorage.setItem(TOKEN_KEY, token);
    else window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* stockage indisponible (navigation privée) : la session reste en mémoire */
  }
  window.dispatchEvent(new Event("allodoc:auth"));
}

/** Appel de l'API Symfony. Utilisable côté serveur (sans jeton) et côté navigateur. */
export async function api<T>(path: string, init: RequestInit & { auth?: boolean } = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (init.body) headers.set("Content-Type", "application/json");
  const token = init.auth === false ? null : getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(`${API_URL}${path}`, { ...init, headers, cache: "no-store" });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    if (response.status === 401 && token) setToken(null);
    throw new ApiError(data?.error ?? data?.detail ?? translate("error.service"), response.status, data?.code);
  }
  return data as T;
}

/** URL publique d'un pays : son code ISO en minuscules (/ml, /sn, /ke...). */
export function countryPath(code: CountryCode) {
  return `/${code.toLowerCase()}`;
}

/** Code pays lu dans une URL ; l'existence du pays est vérifiée par l'API (404 sinon). */
export function countryFromPath(path: string): CountryCode | null {
  return /^[a-z]{2}$/i.test(path) ? path.toUpperCase() : null;
}

const displayNames = new Map<string, Intl.DisplayNames | null>();

/**
 * Nom du pays dans la langue de l'interface (Intl.DisplayNames), avec repli sur les traductions
 * et le nom français du référentiel pour les anciens navigateurs (WebView Android d'entrée de gamme).
 */
export function countryName(code: CountryCode) {
  const lang = getLang();
  const fixed = translateOr(`country.${code}`, "");
  if (fixed) return fixed;
  if (!displayNames.has(lang)) {
    try {
      displayNames.set(lang, new Intl.DisplayNames([intlLocale(lang)], { type: "region" }));
    } catch {
      displayNames.set(lang, null);
    }
  }
  const name = displayNames.get(lang)?.of(code);
  return name && name !== code ? name : (FRENCH_NAMES[code] ?? code);
}

/** Noms du référentiel (français), mémorisés à la lecture de /api/countries. */
const FRENCH_NAMES: Record<string, string> = {};

export function rememberCountryNames(countries: { code: CountryCode; name: string }[]) {
  for (const c of countries) FRENCH_NAMES[c.code] = c.name;
}
