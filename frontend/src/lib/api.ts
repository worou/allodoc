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
    throw new ApiError(data?.error ?? data?.detail ?? "Le service est momentanément indisponible.", response.status, data?.code);
  }
  return data as T;
}

/** Correspondance entre le code ISO et l'URL publique (/ml, /bf, /ne). */
export const COUNTRY_PATHS: Record<CountryCode, string> = { ML: "ml", BF: "bf", NE: "ne" };

export function countryFromPath(path: string): CountryCode | null {
  const code = path.toUpperCase();
  return code === "ML" || code === "BF" || code === "NE" ? code : null;
}

export const COUNTRY_NAMES: Record<CountryCode, string> = { ML: "Mali", BF: "Burkina Faso", NE: "Niger" };
