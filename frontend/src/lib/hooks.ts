import { useCallback, useEffect, useMemo, useState } from "react";
import { api, ApiError, rememberCountryNames } from "./api";
import { specialtyName } from "./format";
import { translate, useI18n } from "./i18n";
import type { Country, CountryCode, ExchangeRates, Specialty } from "./types";
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
        const error = e instanceof ApiError ? e : new ApiError(translate("error.network"), 0);
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

function readCache<T>(key: string): T[] {
  if (memory.has(key)) return memory.get(key) as T[];
  try {
    const stored = window.localStorage.getItem(key);
    return stored ? (JSON.parse(stored) as T[]) : [];
  } catch {
    return [];
  }
}

/** path vide : rien à charger. La liste suit la clé (ex. régions du pays choisi). */
function useCachedList<T>(key: string, path: string, map: (raw: never[]) => T[]): T[] {
  const [state, setState] = useState<{ key: string; items: T[] }>(() => ({ key, items: readCache<T>(key) }));
  const items = state.key === key ? state.items : readCache<T>(key);

  useEffect(() => {
    if (state.key !== key) setState({ key, items: readCache<T>(key) });
    if (!path || memory.has(key)) return;
    api<never[]>(path, { auth: false })
      .then((raw) => {
        const list = map(raw);
        memory.set(key, list);
        setState({ key, items: list });
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
  const { lang } = useI18n();
  const items = useCachedList<Specialty>("allodoc.specialties.v1", "/api/specialties", (raw) => raw as unknown as Specialty[]);
  // Noms dans la langue choisie : la saisie semi-automatique cherche aussi dans cette langue.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => items.map((s) => ({ ...s, name: specialtyName(s) })), [items, lang]);
}

/** Régions d'un pays (plus de 800 sur le continent : on ne charge que celles du pays utile). */
export function useRegions(country: CountryCode | null): SearchRegion[] {
  const code = country?.toUpperCase() ?? "";
  const items = useCachedList<SearchRegion>(`allodoc.regions.v2.${code}`, code ? `/api/regions?country.code=${code}` : "", (raw) =>
    (raw as unknown as { slug: string; name: string; country: { code: CountryCode } }[]).map((r) => ({
      slug: r.slug,
      name: r.name,
      country: r.country.code,
    })),
  );
  return code ? items : [];
}

/** Les 55 pays du référentiel, dans l'ordre des sous-régions. */
export function useCountries(): Country[] {
  const countries = useCachedList<Country>("allodoc.countries.v1", "/api/countries", (raw) =>
    (raw as unknown as Country[]).map(({ code, name, capital, subregion, phonePrefix, phoneLengths, currency, timezone }) => ({
      code,
      name,
      capital,
      subregion,
      phonePrefix,
      phoneLengths,
      currency,
      timezone,
    })),
  );
  rememberCountryNames(countries);
  return countries;
}

/** Titre de l'onglet (référencement minimal côté SPA). */
export function useTitle(title: string) {
  const { t } = useI18n();
  useEffect(() => {
    document.title = title ? `${title} · AlloDoc` : t("meta.title");
  }, [title, t]);
}

/**
 * Taux de change face au dollar (équivalents en $US des prix en FCFA) : mémoire + stockage local,
 * rafraîchis une fois par session. null tant qu'aucun taux n'est connu.
 */
let ratesRequest: Promise<ExchangeRates> | null = null;

export function useExchangeRates(): Record<string, number> | null {
  const [rates, setRates] = useState<Record<string, number> | null>(() => {
    try {
      const stored = window.localStorage.getItem("allodoc.rates.v1");
      return stored ? (JSON.parse(stored) as Record<string, number>) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    let cancelled = false;
    ratesRequest ??= api<ExchangeRates>("/api/exchange-rates", { auth: false });
    ratesRequest
      .then((data) => {
        if (cancelled) return;
        setRates(data.rates);
        try {
          window.localStorage.setItem("allodoc.rates.v1", JSON.stringify(data.rates));
        } catch {
          /* stockage indisponible */
        }
      })
      .catch(() => {
        ratesRequest = null;
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return rates;
}
