import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "./api";
import type { CountryCode, Specialty } from "./types";
import type { SearchRegion } from "../components/SearchBar";

interface State<T> {
  data: T | null;
  error: ApiError | null;
  loading: boolean;
}

/** Charge une ressource de l'API ; recharge quand le chemin change. path = null : rien à charger. */
export function useApi<T>(path: string | null, options: { auth?: boolean } = {}) {
  const [state, setState] = useState<State<T>>({ data: null, error: null, loading: path !== null });
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (path === null) return;
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: null }));
    api<T>(path, { auth: options.auth })
      .then((data) => !cancelled && setState({ data, error: null, loading: false }))
      .catch((e: unknown) => {
        if (cancelled) return;
        const error = e instanceof ApiError ? e : new ApiError("Connexion impossible. Vérifiez votre réseau.", 0);
        setState({ data: null, error, loading: false });
      });
    return () => {
      cancelled = true;
    };
  }, [path, options.auth, version]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);
  return { ...state, reload };
}

/**
 * Référentiels (spécialités, régions) : mémoire + stockage local pour s'afficher immédiatement,
 * y compris hors ligne, puis rafraîchis en arrière-plan.
 */
const memory = new Map<string, unknown>();

function useCachedList<T>(key: string, path: string, map: (raw: never[]) => T[]): T[] {
  const [items, setItems] = useState<T[]>(() => {
    if (memory.has(key)) return memory.get(key) as T[];
    try {
      const stored = window.localStorage.getItem(key);
      return stored ? (JSON.parse(stored) as T[]) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    if (memory.has(key)) return;
    api<never[]>(path, { auth: false })
      .then((raw) => {
        const list = map(raw);
        memory.set(key, list);
        setItems(list);
        try {
          window.localStorage.setItem(key, JSON.stringify(list));
        } catch {
          /* stockage plein ou indisponible */
        }
      })
      .catch(() => {});
    // map est stable par appelant
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, path]);

  return items;
}

export function useSpecialties(): Specialty[] {
  return useCachedList<Specialty>("allodoc.specialties.v1", "/api/specialties", (raw) => raw as unknown as Specialty[]);
}

export function useRegions(): SearchRegion[] {
  return useCachedList<SearchRegion>("allodoc.regions.v1", "/api/regions", (raw) =>
    (raw as unknown as { slug: string; name: string; country: { code: CountryCode } }[]).map((r) => ({
      slug: r.slug,
      name: r.name,
      country: r.country.code,
    })),
  );
}

/** Titre de l'onglet (référencement minimal côté SPA). */
export function useTitle(title: string) {
  useEffect(() => {
    document.title = title ? `${title} · AlloDoc` : "AlloDoc : rendez-vous médical au Mali, au Burkina Faso et au Niger";
  }, [title]);
}
