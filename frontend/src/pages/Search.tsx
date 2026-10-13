import { Link, useSearchParams } from "react-router";
import { Icon } from "../components/Icon";
import { PractitionerCard } from "../components/PractitionerCard";
import { SearchBar } from "../components/SearchBar";
import { ErrorState, Loading } from "../components/States";
import { countryFromPath, countryName } from "../lib/api";
import { insuranceName, languageName } from "../lib/format";
import { useApi, useRegions, useSpecialties, useTitle } from "../lib/hooks";
import { useI18n } from "../lib/i18n";
import type { SearchResult } from "../lib/types";

/** Langues parlées par les praticiens (filtre), distinctes de la langue de l'interface. */
const LANGUAGES = ["en", "ar", "pt", "sw", "ha", "yo", "ig", "wo", "bm", "mos", "dje", "ff", "dyu", "son", "ber", "zu", "af"];
const INSURANCES = ["AMO", "AMU (CNAMU)", "CMU", "IPM", "NHIA", "SHA", "Medical aid", "Mutuelle", "Assurance privée"];

/** Résultats de recherche avec filtres ; tout l'état vit dans l'URL (partageable, bouton retour). */
export default function Search() {
  const { lang, t, tn } = useI18n();
  const [params, setParams] = useSearchParams();
  const specialties = useSpecialties();
  const country = countryFromPath(params.get("country") ?? "");
  const regions = useRegions(country);
  const specialty = specialties.find((s) => s.slug === params.get("specialty"));
  const region = regions.find((r) => r.slug === params.get("region") && (!country || r.country === country));
  const page = Math.max(1, Number(params.get("page") ?? 1));

  const label = [specialty?.name ?? (params.get("q") ? `« ${params.get("q")} »` : null), region?.name ?? (country ? countryName(country) : null)]
    .filter(Boolean)
    .join(" · ");
  useTitle(label || t("searchPage.title"));

  const query = new URLSearchParams(params);
  query.set("perPage", "10");
  query.set("days", "5");
  const { data, error, loading, reload } = useApi<SearchResult>(`/api/search?${query.toString()}`, { auth: false });

  function setFilter(key: string, value: string | null) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete("page");
    setParams(next);
  }

  const pageHref = (p: number) => {
    const next = new URLSearchParams(params);
    next.set("page", String(p));
    return `/recherche?${next.toString()}`;
  };

  return (
    <>
      <div className="results-head">
        <div className="container">
          <SearchBar
            key={`${lang}:${params.toString()}`}
            compact
            specialties={specialties}
            initial={{ q: params.get("q") ?? undefined, specialty: params.get("specialty") ?? undefined, region: params.get("region") ?? undefined, country: country ?? undefined }}
          />
          <div className="filters" role="group" aria-label={t("searchPage.filters")}>
            <button
              type="button"
              className="filter-chip"
              aria-pressed={params.get("teleconsultation") === "1"}
              onClick={() => setFilter("teleconsultation", params.get("teleconsultation") === "1" ? null : "1")}
            >
              <Icon name="video" size={16} /> {t("common.teleconsultation")}
            </button>
            <label className={`filter-chip${params.get("language") ? " active" : ""}`}>
              <Icon name="language" size={16} />
              <select value={params.get("language") ?? ""} onChange={(e) => setFilter("language", e.target.value || null)} aria-label={t("searchPage.spokenLanguage")}>
                <option value="">{t("searchPage.spokenLanguage")}</option>
                {LANGUAGES.map((code) => (
                  <option key={code} value={code}>
                    {languageName({ code, name: code })}
                  </option>
                ))}
              </select>
            </label>
            <label className={`filter-chip${params.get("insurance") ? " active" : ""}`}>
              <Icon name="shield" size={16} />
              <select value={params.get("insurance") ?? ""} onChange={(e) => setFilter("insurance", e.target.value || null)} aria-label={t("searchPage.insuranceLabel")}>
                <option value="">{t("searchPage.insurance")}</option>
                {INSURANCES.map((i) => (
                  <option key={i} value={i}>
                    {insuranceName(i)}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </div>

      <div className="container">
        {loading && !data && <Loading label={t("searchPage.loading")} />}
        {error && <ErrorState message={error.message} onRetry={reload} />}
        {data && (
          <div style={{ opacity: loading ? 0.6 : 1 }}>
            <h1 className="results-count">
              {tn("searchPage.results", data.total)}
              {label ? ` · ${label}` : ""}
            </h1>
            {data.total === 0 ? (
              <div className="card empty">
                <Icon name="search" size={40} />
                <p style={{ fontWeight: 700 }}>{t("searchPage.empty")}</p>
                <p className="muted">{t("searchPage.emptyHint")}</p>
                {country && (
                  <Link to={`/recherche?country=${country}`} className="btn btn-outline btn-sm" style={{ marginTop: 14 }}>
                    {t("searchPage.allInCountry", { country: countryName(country) })}
                  </Link>
                )}
              </div>
            ) : (
              <div className="results">
                {data.items.map((item) => (
                  <PractitionerCard key={item.slug} item={item} />
                ))}
              </div>
            )}
            {data.pages > 1 && (
              <nav className="pagination" aria-label={t("searchPage.pages")}>
                {page > 1 && <Link to={pageHref(page - 1)}>‹</Link>}
                {Array.from({ length: data.pages }, (_, i) => i + 1).map((p) =>
                  p === page ? (
                    <span key={p} aria-current="page">
                      {p}
                    </span>
                  ) : (
                    <Link key={p} to={pageHref(p)}>
                      {p}
                    </Link>
                  ),
                )}
                {page < data.pages && <Link to={pageHref(page + 1)}>›</Link>}
              </nav>
            )}
          </div>
        )}
      </div>
    </>
  );
}
