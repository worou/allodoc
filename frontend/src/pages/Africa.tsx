import { lazy, Suspense, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { Flag } from "../components/Flag";
import { useRememberedCountry } from "../components/Header";
import { Icon } from "../components/Icon";
import { ErrorState, Loading } from "../components/States";
import { SUBREGIONS, subregionColor, subregionFromSlug, subregionName, subregionPath } from "../lib/africa";
import { countryName, countryPath } from "../lib/api";
import { useApi, useCountries, useTitle } from "../lib/hooks";
import { Trans, useI18n } from "../lib/i18n";
import type { CountryCode, SubregionCode, SubregionOverview } from "../lib/types";
import NotFound from "./NotFound";

const AfricaMap = lazy(() => import("../components/AfricaMap"));

/**
 * L'Afrique par sous-région : onglets (nord, ouest, centre, est, australe), carte du continent
 * et pays de la sous-région choisie, chacun menant à sa page (régions et praticiens).
 */
export default function Africa() {
  const { t, tn } = useI18n();
  const navigate = useNavigate();
  const { subregion: slug } = useParams();
  const remembered = useRememberedCountry();
  const countries = useCountries();
  const fromSlug = subregionFromSlug(slug);
  const rememberedSub = countries.find((c) => c.code === remembered)?.subregion;
  const selected: SubregionCode = fromSlug ?? rememberedSub ?? "west";
  const [hover, setHover] = useState<CountryCode | null>(null);
  const tabs = useRef<(HTMLAnchorElement | null)[]>([]);
  useTitle(fromSlug ? subregionName(fromSlug) : t("africa.title"));

  const { data, error, loading, reload } = useApi<SubregionOverview[]>("/api/subregions", { auth: false });
  const subregionOf = useMemo(() => Object.fromEntries(countries.map((c) => [c.code, c.subregion])), [countries]);
  const counts = useMemo(() => Object.fromEntries((data ?? []).flatMap((g) => g.countries.map((c) => [c.code, c.practitionerCount]))), [data]);

  if (slug && !fromSlug) return <NotFound />;

  const group = data?.find((g) => g.code === selected);
  // Pays avec praticiens en tête, puis ordre alphabétique dans la langue de l'interface.
  const list = [...(group?.countries ?? [])].sort(
    (a, b) => Number(b.practitionerCount > 0) - Number(a.practitionerCount > 0) || countryName(a.code).localeCompare(countryName(b.code)),
  );

  function onTabKey(e: KeyboardEvent, index: number) {
    const dir = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!dir) return;
    e.preventDefault();
    const rtl = document.documentElement.dir === "rtl" ? -1 : 1;
    const next = (index + dir * rtl + SUBREGIONS.length) % SUBREGIONS.length;
    navigate(subregionPath(SUBREGIONS[next].code), { replace: true });
    tabs.current[next]?.focus();
  }

  return (
    <>
      <section className="hero hero-africa">
        <div className="container">
          <nav className="crumbs crumbs-light" aria-label={t("practitioner.breadcrumb")}>
            <Link to="/">{t("nav.home")}</Link> › <Link to="/afrique">{t("nav.africa")}</Link>
            {fromSlug && <> › <span>{subregionName(fromSlug)}</span></>}
          </nav>
          <h1>
            <Trans text={t("africa.heroTitle")} values={{ em: <em>{t("africa.heroTitleEm")}</em> }} />
          </h1>
          <p className="lead">{t("africa.heroLead")}</p>
        </div>
      </section>

      <div className="subregion-tabs-wrap">
        <div className="container">
          <div className="subregion-tabs" role="tablist" aria-label={t("africa.tabs")}>
            {SUBREGIONS.map((s, i) => {
              const g = data?.find((x) => x.code === s.code);
              const isActive = s.code === selected;
              return (
                <Link
                  key={s.code}
                  ref={(el) => {
                    tabs.current[i] = el;
                  }}
                  to={subregionPath(s.code)}
                  replace
                  role="tab"
                  id={`tab-${s.code}`}
                  aria-selected={isActive}
                  aria-controls="subregion-panel"
                  tabIndex={isActive ? 0 : -1}
                  className="subregion-tab"
                  style={{ "--tab": s.color } as CSSProperties}
                  onKeyDown={(e) => onTabKey(e, i)}
                >
                  <span className="dot" aria-hidden="true" />
                  <span>
                    {subregionName(s.code)}
                    {g && <small>{tn("africa.countries", g.countries.length)}</small>}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      <section className="section">
        <div className="container africa-layout" role="tabpanel" id="subregion-panel" aria-labelledby={`tab-${selected}`}>
          <div className="africa-map-col">
            <Suspense fallback={<div className="skeleton map-skeleton" />}>
              <AfricaMap
                subregions={subregionOf}
                selected={selected}
                counts={counts}
                highlighted={hover}
                onHover={setHover}
                onPickSubregion={(code) => navigate(subregionPath(code), { replace: true })}
              />
            </Suspense>
          </div>

          <div>
            <div className="section-head" style={{ marginBottom: 14 }}>
              <div>
                <h2 className="section-title" style={{ "--accent": subregionColor(selected) } as CSSProperties}>
                  <span className="subregion-title">{subregionName(selected)}</span>
                </h2>
                {group && (
                  <p className="section-sub">
                    {tn("africa.countries", group.countries.length)} · {tn("country.practitioners", group.practitionerCount)}
                  </p>
                )}
              </div>
            </div>

            {loading && !data && <Loading />}
            {error && <ErrorState message={error.message} onRetry={reload} />}
            <div className="africa-country-grid">
              {list.map((c) => (
                <Link
                  key={c.code}
                  to={countryPath(c.code)}
                  className={`card africa-country${hover === c.code ? " hovered" : ""}`}
                  onMouseEnter={() => setHover(c.code)}
                  onMouseLeave={() => setHover(null)}
                  onFocus={() => setHover(c.code)}
                  onBlur={() => setHover(null)}
                >
                  <Flag code={c.code} width={44} />
                  <span className="africa-country-body">
                    <b>{countryName(c.code)}</b>
                    <small className="muted">
                      {t("africa.capital", { capital: c.capital })} · {tn("africa.regions", c.regionCount)}
                    </small>
                    {c.practitionerCount > 0 ? (
                      <small className="count">{tn("country.practitioners", c.practitionerCount)}</small>
                    ) : (
                      <small className="count none">{t("africa.comingSoon")}</small>
                    )}
                  </span>
                  <Icon name="chevronRight" size={18} className="chev" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
